import { z } from "zod";

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const TargetUserIdParams = z.object({
  userId: z.string().min(1)
});

const InvitationIdParams = z.object({
  invitationId: z.string().min(1)
});

const ConnectBody = z
  .object({
    note: z.string().max(300).optional()
  })
  .strict()
  .optional();

const GetNetworkQuery = PaginationSchema;

export {
  ConnectBody,
  GetNetworkQuery,
  InvitationIdParams,
  TargetUserIdParams
};
