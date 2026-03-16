# CROSS-CUTTING: Media Pipeline
# File: src/modules/media/ + src/workers/media/
# Worker service: worker-media (images), worker-media-video (video — separate container)

## UPLOAD FLOW ENDPOINTS
POST /api/v1/media/upload-url   → returns signed PUT URL + mediaId
POST /api/v1/media/confirm      → confirms upload, enqueues processing job

## MEDIA CATEGORIES & CONSTRAINTS
```
avatar:            image/jpeg|png|webp    max 5MB   bucket: avatars (public)
portfolio_image:   image/jpeg|png|webp    max 50MB  bucket: portfolio (public)
portfolio_video:   video/mp4              max 200MB bucket: portfolio (public, after transcode)
post_image:        image/jpeg|png|webp    max 50MB  bucket: post-media (public)
post_video:        video/mp4              max 200MB bucket: post-media (public, after transcode)
certification:     image/jpeg|png|pdf     max 20MB  bucket: certifications (PRIVATE)
chat_attachment:   image/*|pdf|docx|xlsx  max 25MB  bucket: chat-attachments (PRIVATE)
verification_doc:  image/jpeg|png|pdf     max 20MB  bucket: verification-docs (PRIVATE)
```

## STORAGE KEY PATTERN (server-generated — never trust client path)
{category}/{entityId}/{uuid}.{ext}
Example: portfolio/bbbbbbbb-0001.../550e8400-e29b-41d4-a716-446655440000.webp

## PENDING MEDIA RECORD (create before returning upload URL)
Expiry: STORAGE_PENDING_MEDIA_TTL_SECONDS (env, default 1800 = 30 min)
Cleanup job: delete pending records older than 30 min that were never confirmed

## ZOD SCHEMAS
```typescript
export const RequestUploadUrlBody = z.object({
  category:  z.enum(['avatar','portfolio_image','portfolio_video','post_image','post_video',
                     'certification','chat_attachment','verification_doc']),
  mimeType:  z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1).max(209715200), // 200MB hard cap
  filename:  z.string().max(255).optional(),
}).strict();

export const ConfirmUploadBody = z.object({ mediaId: z.string().uuid() }).strict();
```

## IMAGE PROCESSING PIPELINE (Sharp — runs in worker-media)
Step 1: ClamAV scan → POST to clamav-service:3310 (CLAMAV_HOST:CLAMAV_PORT)
        If infected: delete from storage, mark media INFECTED, emit FRAUD_SIGNAL (MALWARE_DETECTED, score=100)
Step 2: Try decode image — reject if corrupt (catch sharp decode error)
Step 3: Strip EXIF metadata (sharp().withMetadata(false))
Step 4: Resize to variants:
  thumbnail: 80×80  crop center  WebP quality 85
  small:     200×200 cover fit   WebP quality 85
  medium:    400×400 cover fit   WebP quality 85
  large:     800×800 contain fit WebP quality 85
  original:  unchanged            original format (keep for download/moderation)
Step 5: Upload all variants to storage
Step 6: Update media record: status=READY, variantUrls JSON, finalCdnUrl=medium variant URL

## VIDEO TRANSCODING PIPELINE (FFmpeg — runs in worker-media-video, concurrency 2)
Step 1: ClamAV scan
Step 2: ffprobe to get duration, resolution, codec
        Reject if: duration > 300s, resolution > 3840×2160, codec not in [h264,hevc,vp9,av1]
Step 3: ffmpeg transcode → H.264/AAC MP4, max 720p (1280×720), CRF 23
        Command: ffmpeg -i input.mp4 -vcodec libx264 -crf 23 -vf "scale=1280:720:force_original_aspect_ratio=decrease" -acodec aac -movflags +faststart output.mp4
Step 4: Generate poster: ffmpeg -i input.mp4 -ss 00:00:02 -frames:v 1 -vf "scale=640:360" poster.webp
Step 5: Upload transcoded MP4 + poster to CDN
Step 6: Move original to cold storage after 7 days (lifecycle rule on bucket)
Step 7: Update media record status=READY
TIMEOUT: 10 minutes per job. On timeout → mark FAILED, notify user.

## CDN CACHE HEADERS
thumbnails/small: Cache-Control: public, max-age=31536000, immutable
medium/large:     Cache-Control: public, max-age=2592000
private assets:   Cache-Control: private, no-cache (signed URL handles access)

## PRIVATE ASSET ACCESS
certifications, chat_attachments, verification_docs: never expose raw storage URL
Always generate signed URL with expiry:
  read URL TTL: STORAGE_PRIVATE_READ_URL_TTL_SECONDS (env, default 3600 = 1 hour)
  chat attachments: 1-hour signed URL per request
