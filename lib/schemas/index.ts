import { z } from 'zod';

// Common schemas
export const IdSchema = z.string().uuid().nullable();
export const DateSchema = z.string().nullable(); // Use flexible string validation for Supabase timestamps

// User role enum
export const UserRoleSchema = z.enum(['admin', 'lr', 'member']);

// Room status enum
export const RoomStatusSchema = z.enum(['active', 'closed', 'archived']);

// Request status enum
export const RequestStatusSchema = z.enum(['pending', 'approved', 'rejected', 'revoked']);

// Join request status enum
export const JoinRequestStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

// Signature status enum
export const SignatureStatusSchema = z.enum(['pending', 'signed', 'rejected']);

// KKS status enum
export const KksStatusSchema = z.enum(['draft', 'submitted', 'sent']);

// Basic schemas
export const ProfileSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  company_id: IdSchema.nullable().optional(),
  role: UserRoleSchema.nullable().optional(),
  created_at: DateSchema.nullable().optional(),
  updated_at: DateSchema.nullable().optional(),
});

export const CompanySchema = z.object({
  id: IdSchema,
  name: z.string(),
  address: z.string().nullable(),
  contact_email: z.string().email().nullable(),
  contact_phone: z.string().nullable(),
  vat_number: z.string().nullable(),
  created_at: DateSchema.nullable(),
  updated_at: DateSchema.nullable(),
});

export const SubstanceSchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  cas_number: z.string().nullable().optional(),
  ec_number: z.string().nullable().optional(),
  created_at: DateSchema.nullable().optional(),
  updated_at: DateSchema.nullable().optional(),
});

export const RoomSchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  status: RoomStatusSchema,
  substance_id: IdSchema.nullable(),
  created_by: IdSchema.nullable(),
  archived_at: DateSchema.nullable(),
  archive_reason: z.string().nullable(),
  archive_initiated_by: IdSchema.nullable(),
  created_at: DateSchema.nullable(),
  updated_at: DateSchema.nullable(),
});

export const MemberSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  user_id: IdSchema,
  role: UserRoleSchema,
  joined_at: DateSchema,
});

export const DocumentSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_size: z.number().nullable(),
  mime_type: z.string().nullable(),
  uploaded_by: IdSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const AccessPackageSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  package_data: z.any().nullable(),
  created_by: IdSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const AccessRequestSchema = z.object({
  id: IdSchema,
  package_id: IdSchema,
  requester_id: IdSchema,
  status: RequestStatusSchema,
  justification: z.string().nullable(),
  access_token: z.string().nullable(),
  approved_by: IdSchema.nullable(),
  approved_at: DateSchema.nullable(),
  rejected_reason: z.string().nullable(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const LrVoteSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  candidate_id: IdSchema,
  voter_id: IdSchema,
  technical_score: z.number().min(0).max(5).nullable(),
  experience_score: z.number().min(0).max(5).nullable(),
  communication_score: z.number().min(0).max(5).nullable(),
  leadership_score: z.number().min(0).max(5).nullable(),
  availability_score: z.number().min(0).max(5).nullable(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const LrCandidateSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  user_id: IdSchema,
  is_selected: z.boolean(),
  created_at: DateSchema,
});

export const AgreementSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  title: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  agreement_type: z.string(),
  created_by: IdSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const AgreementPartySchema = z.object({
  id: IdSchema,
  agreement_id: IdSchema,
  user_id: IdSchema,
  signature_status: SignatureStatusSchema,
  signature_data: z.any().nullable(),
  signed_at: DateSchema.nullable(),
  created_at: DateSchema,
});

export const KksSubmissionSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  title: z.string(),
  description: z.string().nullable(),
  submission_data: z.any(),
  status: KksStatusSchema,
  created_by: IdSchema,
  submitted_at: DateSchema.nullable(),
  sent_at: DateSchema.nullable(),
  tracking_number: z.string().nullable(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const KksEvidenceSchema = z.object({
  id: IdSchema,
  submission_id: IdSchema,
  file_path: z.string(),
  file_type: z.string(),
  file_hash: z.string().nullable(),
  generated_at: DateSchema,
});

export const MessageSchema = z.object({
  id: IdSchema,
  room_id: IdSchema,
  sender_id: IdSchema,
  content: z.string(),
  message_type: z.string(),
  attachments: z.any().nullable(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const JoinRequestSchema = z.object({
  request_id: IdSchema,
  mbdf_room_id: IdSchema.nullable(),
  company_id: IdSchema.nullable(),
  requested_by: IdSchema.nullable(),
  message: z.string().nullable(),
  accept_terms: z.boolean().nullable(),
  status: JoinRequestStatusSchema.nullable(),
  decision_by: IdSchema.nullable(),
  decision_note: z.string().nullable(),
  created_at: DateSchema.nullable(),
  decided_at: DateSchema.nullable(),
});

// Extended schemas with joins - Base room schema must be defined first
export const RoomWithDetailsSchema = RoomSchema.extend({
  substance: SubstanceSchema.nullable(),
  created_by_profile: ProfileSchema.nullable(),
  member_count: z.number().optional(),
  document_count: z.number().optional(),
  package_count: z.number().optional(),
  is_member: z.boolean().optional(),
  user_role: z.string().nullable().optional(),
});

export const MemberWithProfileSchema = MemberSchema.extend({
  profiles: ProfileSchema.extend({
    company: CompanySchema.nullable(),
  }),
});

export const AccessRequestWithDetailsSchema = AccessRequestSchema.extend({
  access_package: AccessPackageSchema,
  profiles: ProfileSchema,
  approved_by_profile: ProfileSchema.optional(),
});

export const DocumentWithUploaderSchema = DocumentSchema.extend({
  profiles: ProfileSchema.optional(),
  download_url: z.string().url().nullable().optional(),
  mbdf_room: z.object({
    id: z.string().uuid(),
    name: z.string(),
    substance: z.object({
      name: z.string(),
      cas_number: z.string().nullable(),
      ec_number: z.string().nullable(),
    }).nullable(),
  }).nullable().optional(),
});

export const JoinRequestWithDetailsSchema = JoinRequestSchema.extend({
  profiles: ProfileSchema.extend({
    company: CompanySchema.nullable(),
  }).nullable(),
  decision_by_profile: ProfileSchema.nullable(),
  mbdf_room: RoomSchema.nullable(),
});

// Now we can reference RoomWithDetailsSchema safely
export const KksSubmissionWithDetailsSchema = KksSubmissionSchema.extend({
  created_by_profile: ProfileSchema,
  room: RoomWithDetailsSchema,
});

export const AgreementWithDetailsSchema = AgreementSchema.extend({
  created_by_profile: ProfileSchema.extend({
    company: CompanySchema.nullable(),
  }).nullable(),
  room: RoomWithDetailsSchema,
  agreement_party: z.array(AgreementPartySchema.extend({
    profiles: ProfileSchema.extend({
      company: CompanySchema.nullable(),
    }),
  })),
});

export const VotingResultSchema = z.object({
  candidate_id: IdSchema,
  user_id: IdSchema,
  full_name: z.string(),
  total_score: z.number(),
  vote_count: z.number(),
});

// API input schemas
export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  substance_id: IdSchema,
});

export const UploadDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  room_id: IdSchema,
  visibility: z.enum(['public', 'private']).default('public'),
});

export const CreateAccessRequestSchema = z.object({
  package_id: IdSchema,
  justification: z.string().min(1).max(500),
});

export const ApproveAccessRequestSchema = z.object({
  access_token: z.string().min(1),
});

export const RejectAccessRequestSchema = z.object({
  rejected_reason: z.string().min(1).max(500),
});

export const SubmitVoteSchema = z.object({
  candidate_id: IdSchema,
  technical_score: z.number().min(0).max(5),
  experience_score: z.number().min(0).max(5),
  communication_score: z.number().min(0).max(5),
  leadership_score: z.number().min(0).max(5),
  availability_score: z.number().min(0).max(5),
});

export const CreateAgreementSchema = z.object({
  room_id: IdSchema,
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.string().min(1),
  agreement_type: z.string(),
  party_ids: z.array(IdSchema),
});

export const CreateKksSubmissionSchema = z.object({
  room_id: IdSchema,
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  submission_data: z.any(),
});

export const CreateJoinRequestSchema = z.object({
  roomId: IdSchema,
  message: z.string().optional(),
  acceptTerms: z.boolean().default(false),
});

export const UpdateJoinRequestSchema = z.object({
  status: JoinRequestStatusSchema,
  decisionNote: z.string().optional(),
});

// API response schemas
export const RoomsListResponseSchema = z.object({
  items: z.array(RoomWithDetailsSchema),
  total: z.number(),
});

export const DocumentsListResponseSchema = z.object({
  items: z.array(DocumentWithUploaderSchema),
  total: z.number(),
  success: z.boolean().optional(),
  isMember: z.boolean().optional(),
});

export const MembersListResponseSchema = z.object({
  items: z.array(MemberWithProfileSchema),
  total: z.number(),
});

export const AccessRequestsListResponseSchema = z.object({
  items: z.array(AccessRequestWithDetailsSchema),
  total: z.number(),
});

export const VotingSummaryResponseSchema = z.object({
  results: z.array(VotingResultSchema),
  my_vote: z.array(LrVoteSchema).nullable(),
  is_finalized: z.boolean(),
});

export const AgreementsListResponseSchema = z.object({
  items: z.array(AgreementWithDetailsSchema),
  total: z.number(),
});

export const KksListResponseSchema = z.object({
  items: z.array(KksSubmissionWithDetailsSchema),
  total: z.number(),
});

export const SubstancesListResponseSchema = z.object({
  items: z.array(SubstanceSchema),
  total: z.number(),
});

export const JoinRequestsListResponseSchema = z.object({
  requests: z.array(JoinRequestWithDetailsSchema),
  success: z.boolean(),
});

export const MessageResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

// Type exports
export type Profile = z.infer<typeof ProfileSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type Substance = z.infer<typeof SubstanceSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type AccessPackage = z.infer<typeof AccessPackageSchema>;
export type AccessRequest = z.infer<typeof AccessRequestSchema>;
export type LrVote = z.infer<typeof LrVoteSchema>;
export type LrCandidate = z.infer<typeof LrCandidateSchema>;
export type Agreement = z.infer<typeof AgreementSchema>;
export type AgreementParty = z.infer<typeof AgreementPartySchema>;
export type KksSubmission = z.infer<typeof KksSubmissionSchema>;
export type KksSubmissionWithDetails = z.infer<typeof KksSubmissionWithDetailsSchema>;
export type KksEvidence = z.infer<typeof KksEvidenceSchema>;
export type Message = z.infer<typeof MessageSchema>;

export type RoomWithDetails = z.infer<typeof RoomWithDetailsSchema>;
export type MemberWithProfile = z.infer<typeof MemberWithProfileSchema>;
export type AccessRequestWithDetails = z.infer<typeof AccessRequestWithDetailsSchema>;
export type DocumentWithUploader = z.infer<typeof DocumentWithUploaderSchema>;
export type AgreementWithDetails = z.infer<typeof AgreementWithDetailsSchema>;
export type VotingResult = z.infer<typeof VotingResultSchema>;

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;
export type CreateAccessRequestInput = z.infer<typeof CreateAccessRequestSchema>;
export type ApproveAccessRequestInput = z.infer<typeof ApproveAccessRequestSchema>;
export type RejectAccessRequestInput = z.infer<typeof RejectAccessRequestSchema>;
export type SubmitVoteInput = z.infer<typeof SubmitVoteSchema>;
export type CreateAgreementInput = z.infer<typeof CreateAgreementSchema>;
export type CreateKksSubmissionInput = z.infer<typeof CreateKksSubmissionSchema>;
export type CreateJoinRequestInput = z.infer<typeof CreateJoinRequestSchema>;
export type UpdateJoinRequestInput = z.infer<typeof UpdateJoinRequestSchema>;

export type JoinRequest = z.infer<typeof JoinRequestSchema>;
export type JoinRequestWithDetails = z.infer<typeof JoinRequestWithDetailsSchema>;
export type JoinRequestStatus = z.infer<typeof JoinRequestStatusSchema>;