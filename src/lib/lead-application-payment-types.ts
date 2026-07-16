export type LeadApplicationPaymentLinkInput = {
  applicationId: number;
  amountAed: number;
  universitiesCount: number;
};

export type LeadApplicationPaymentEmailInput = {
  applicationId: number;
  amountAed: number;
  universitiesCount: number;
  recipientEmail: string;
  recipientName: string;
  emailBody: string;
};
