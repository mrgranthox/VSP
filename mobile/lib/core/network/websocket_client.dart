import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../constants/api_constants.dart';
import '../storage/storage_service.dart';

enum WsConnectionState { disconnected, connecting, connected }

class WebSocketClient {
  final StorageService _storage;
  WebSocketChannel? _channel;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  bool _isDisposed = false;

  WsConnectionState _state = WsConnectionState.disconnected;
  WsConnectionState get state => _state;

  final _stateController = StreamController<WsConnectionState>.broadcast();
  Stream<WsConnectionState> get stateStream => _stateController.stream;

  final _eventsController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get eventsStream => _eventsController.stream;

  final Set<String> _joinedRooms = {};

  WebSocketClient({required this._storage});

  void connect() {
    if (_isDisposed) return;
    if (_state == WsConnectionState.connected || _state == WsConnectionState.connecting) {
      return;
    }

    _setState(WsConnectionState.connecting);

    try {
      final wsUrl = _storage.getBaseUrlOverride() != null
          ? _storage.getBaseUrlOverride()!.replaceFirst('http', 'ws').replaceFirst('/api/v1', '/ws')
          : ApiConstants.defaultWsUrl;

      final token = _storage.getAccessToken();
      final uri = Uri.parse(wsUrl).replace(
        queryParameters: token != null ? {'token': token} : null,
      );

      _channel = WebSocketChannel.connect(uri);

      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: true,
      );

      _setState(WsConnectionState.connected);
      _startHeartbeat();

      // Re-join active rooms on reconnect
      for (final room in _joinedRooms) {
        send('room:join', {'room': room});
      }
    } catch (e) {
      debugPrint('WebSocket connection error: $e');
      _onError(e);
    }
  }

  void _onMessage(dynamic raw) {
    try {
      final decoded = jsonDecode(raw.toString()) as Map<String, dynamic>;
      _eventsController.add(decoded);
    } catch (e) {
      debugPrint('Error parsing WS message: $e');
    }
  }

  void _onError(dynamic error) {
    debugPrint('WebSocket error: $error');
    _cleanup();
    _scheduleReconnect();
  }

  void _onDone() {
    debugPrint('WebSocket connection closed');
    _cleanup();
    _scheduleReconnect();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_state == WsConnectionState.connected) {
        send('ping', {'timestamp': DateTime.now().toIso8601String()});
      }
    });
  }

  void _scheduleReconnect() {
    if (_isDisposed) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      if (_state == WsConnectionState.disconnected) {
        connect();
      }
    });
  }

  void send(String event, Map<String, dynamic> data) {
    if (_state != WsConnectionState.connected || _channel == null) return;
    try {
      final payload = jsonEncode({'event': event, 'data': data});
      _channel!.sink.add(payload);
    } catch (e) {
      debugPrint('Error sending WS message: $e');
    }
  }

  void joinRoom(String room) {
    _joinedRooms.add(room);
    send('room:join', {'room': room});
  }

  void leaveRoom(String room) {
    _joinedRooms.remove(room);
    send('room:leave', {'room': room});
  }

  void _setState(WsConnectionState state) {
    _state = state;
    _stateController.add(state);
  }

  void _cleanup() {
    _heartbeatTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _setState(WsConnectionState.disconnected);
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _cleanup();
  }

  void dispose() {
    _isDisposed = true;
    disconnect();
    _stateController.close();
    _eventsController.close();
  }
}
