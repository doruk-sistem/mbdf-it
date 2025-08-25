export const keys = {
  // Rooms
  rooms: {
    all: ['rooms'] as const,
    list: () => ['rooms', 'list'] as const,
    byId: (id: string) => ['rooms', 'byId', id] as const,
    details: (id: string) => ['rooms', 'details', id] as const,
    archiveCheck: (roomId: string) => ['rooms', 'archive', 'check', roomId] as const,
    publicList: ['rooms','public','list'] as const,
    publicById: (id: string) => ['rooms','public','byId', id] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    list: (roomId: string) => ['members', 'list', roomId] as const,
    byRoomId: (roomId: string) => ['members', 'byRoomId', roomId] as const,
    byUserId: (userId: string) => ['members', 'byUserId', userId] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    list: (roomId: string) => ['documents', 'list', roomId] as const,
    byId: (id: string) => ['documents', 'byId', id] as const,
    byRoomId: (roomId: string) => ['documents', 'byRoomId', roomId] as const,
  },

  // Packages and Access Requests
  packages: {
    all: ['packages'] as const,
    list: (roomId: string) => ['packages', 'list', roomId] as const,
    byId: (id: string) => ['packages', 'byId', id] as const,
    requests: (roomId: string) => ['packages', 'requests', roomId] as const,
    myRequests: (userId: string) => ['packages', 'myRequests', userId] as const,
  },

  accessRequests: {
    all: ['accessRequests'] as const,
    list: (roomId: string) => ['accessRequests', 'list', roomId] as const,
    byId: (id: string) => ['accessRequests', 'byId', id] as const,
    byUserId: (userId: string) => ['accessRequests', 'byUserId', userId] as const,
    pending: (roomId: string) => ['accessRequests', 'pending', roomId] as const,
  },

  // Voting
  votes: {
    all: ['votes'] as const,
    me: (roomId: string) => ['votes', 'me', roomId] as const,
    summary: (roomId: string) => ['votes', 'summary', roomId] as const,
    byRoomId: (roomId: string) => ['votes', 'byRoomId', roomId] as const,
    results: (roomId: string) => ['votes', 'results', roomId] as const,
  },

  candidates: {
    all: ['candidates'] as const,
    list: (roomId: string) => ['candidates', 'list', roomId] as const,
    byRoomId: (roomId: string) => ['candidates', 'byRoomId', roomId] as const,
  },

  // Agreements
  agreements: {
    all: ['agreements'] as const,
    list: ['agreements', 'list'] as const,
    byId: (id: string) => ['agreements', 'byId', id] as const,
    byRoomId: (roomId: string) => ['agreements', 'byRoomId', roomId] as const,
    myAgreements: (userId: string) => ['agreements', 'myAgreements', userId] as const,
    parties: (agreementId: string) => ['agreements', 'parties', agreementId] as const,
    signatures: (agreementId: string) => ['agreements', 'signatures', agreementId] as const,
  },

  // KKS (Kimyasal Kayıt Sistemi)
  kks: {
    all: ['kks'] as const,
    list: ['kks', 'list'] as const,
    byId: (id: string) => ['kks', 'byId', id] as const,
    byRoomId: (roomId: string) => ['kks', 'byRoomId', roomId] as const,
    artifacts: (id: string) => ['kks', 'artifacts', id] as const,
    evidence: (submissionId: string) => ['kks', 'evidence', submissionId] as const,
    mySubmissions: (userId: string) => ['kks', 'mySubmissions', userId] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    list: (roomId: string) => ['messages', 'list', roomId] as const,
    byRoomId: (roomId: string) => ['messages', 'byRoomId', roomId] as const,
    byId: (id: string) => ['messages', 'byId', id] as const,
  },

  // User profile and company
  profile: {
    me: ['profile', 'me'] as const,
    byId: (id: string) => ['profile', 'byId', id] as const,
  },

  company: {
    all: ['company'] as const,
    byId: (id: string) => ['company', 'byId', id] as const,
    me: ['company', 'me'] as const,
  },

  // Substances
  substances: {
    all: ['substances'] as const,
    list: ['substances', 'list'] as const,
    byId: (id: string) => ['substances', 'byId', id] as const,
  },

  // Audit logs
  auditLogs: {
    all: ['auditLogs'] as const,
    list: (roomId: string) => ['auditLogs', 'list', roomId] as const,
    byRoomId: (roomId: string) => ['auditLogs', 'byRoomId', roomId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: ['notifications', 'list'] as const,
    unread: ['notifications', 'unread'] as const,
    byUserId: (userId: string) => ['notifications', 'byUserId', userId] as const,
  },

  // Join Requests (company-based)
  join: {
    list: (roomId: string) => ['join','list',roomId] as const,
  },
} as const;

// Helper functions for invalidating related keys
export const invalidationHelpers = {
  // When a room is updated, invalidate related data
  room: (roomId: string) => [
    keys.rooms.all,
    keys.rooms.byId(roomId),
    keys.members.list(roomId),
    keys.documents.list(roomId),
    keys.packages.list(roomId),
    keys.votes.summary(roomId),
    keys.messages.list(roomId),
  ],

  // When a member joins/leaves, invalidate member-related data
  member: (roomId: string, userId?: string) => [
    keys.members.all,
    keys.members.list(roomId),
    keys.rooms.byId(roomId), // Room member count might change
    ...(userId ? [keys.members.byUserId(userId)] : []),
  ],

  // When a document is uploaded/updated
  document: (roomId: string) => [
    keys.documents.all,
    keys.documents.list(roomId),
  ],

  // When an access request is created/updated
  accessRequest: (roomId: string, userId?: string) => [
    keys.accessRequests.all,
    keys.accessRequests.list(roomId),
    keys.packages.requests(roomId),
    ...(userId ? [keys.accessRequests.byUserId(userId)] : []),
  ],

  // When voting occurs
  vote: (roomId: string) => [
    keys.votes.all,
    keys.votes.summary(roomId),
    keys.votes.results(roomId),
  ],

  // When an agreement is created/updated
  agreement: (agreementId: string, roomId?: string) => [
    keys.agreements.all,
    keys.agreements.list,
    keys.agreements.byId(agreementId),
    ...(roomId ? [keys.agreements.byRoomId(roomId)] : []),
  ],

  // When a KKS submission is created/updated
  kks: (submissionId: string, roomId?: string) => [
    keys.kks.all,
    keys.kks.list,
    keys.kks.byId(submissionId),
    ...(roomId ? [keys.kks.byRoomId(roomId)] : []),
  ],

  // When a message is sent
  message: (roomId: string) => [
    keys.messages.all,
    keys.messages.list(roomId),
  ],
};