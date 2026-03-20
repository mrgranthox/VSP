import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { SectionCard } from "@/components/admin/detail-primitives";
import { formatDateTime, formatDisplayName, formatJsonValue, formatNumber, formatRelativeDate } from "@/lib/utils";
import type { AdminContentView } from "@/types/admin";

const ContentSnapshot = ({ contentView }: { contentView?: AdminContentView }) => {
  if (!contentView) {
    return null;
  }

  const content = contentView.content as {
    body?: string;
    visibility?: string;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
    authorUser?: { email?: string | null; profile?: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null } | null;
    media?: Array<{ id: string; mediaUrl?: string | null; mediaType?: string | null }>;
    _count?: { likes?: number; comments?: number };
    rating?: number;
    dimensionScores?: Array<{ dimensionKey: string; score: number }>;
  };

  return (
    <SectionCard description="Direct content viewer response from the admin content endpoint." title="Linked Content">
      <div className="space-y-4">
        <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">{contentView.entityType}</Badge>
            {content.visibility ? <Badge variant={getStatusBadgeVariant(content.visibility)}>{content.visibility}</Badge> : null}
            {typeof content.isDeleted === "boolean" ? <Badge variant={content.isDeleted ? "red" : "green"}>{content.isDeleted ? "Deleted" : "Live"}</Badge> : null}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-700">{content.body ?? "No primary body field on this content entity."}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>Author: {formatDisplayName(content.authorUser?.profile, content.authorUser?.email ?? "Unknown author")}</span>
            {content.createdAt ? <span>Created {formatDateTime(content.createdAt)}</span> : null}
            {content.updatedAt ? <span>Updated {formatRelativeDate(content.updatedAt)}</span> : null}
          </div>
        </div>

        {content.media?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {content.media.map((media) => (
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={media.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{media.mediaType ?? "media asset"}</p>
                <p className="mt-2 break-all text-sm text-slate-700">{media.mediaUrl ?? "No media url recorded"}</p>
              </div>
            ))}
          </div>
        ) : null}

        {content._count ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Likes</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatNumber(content._count.likes ?? 0)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Comments</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatNumber(content._count.comments ?? 0)}</p>
            </div>
          </div>
        ) : null}

        {typeof content.rating === "number" ? (
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Review score</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{content.rating}/5</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(content.dimensionScores ?? []).map((dimension) => (
                <div className="rounded-2xl bg-slate-50 px-4 py-3" key={dimension.dimensionKey}>
                  <p className="text-sm font-semibold capitalize text-slate-700">{dimension.dimensionKey}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{dimension.score}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <details className="rounded-[1.25rem] border border-slate-100 bg-slate-950 text-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Raw entity payload</summary>
          <pre className="overflow-x-auto px-4 pb-4 text-xs">{formatJsonValue(contentView.content)}</pre>
        </details>
      </div>
    </SectionCard>
  );
};

export { ContentSnapshot };
