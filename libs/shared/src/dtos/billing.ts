import { SubscriptionStatus, SubscriptionTier } from '../enums';

export type PaidTier = Exclude<SubscriptionTier, SubscriptionTier.FREE>;

export interface CreateSubscriptionDto {
  plan: PaidTier;
  promotionCode?: string;
}

export interface ChangeSubscriptionPlanDto {
  plan: PaidTier;
}

export enum PaymentWalletType {
  GOOGLE_PAY = 'google_pay',
  APPLE_PAY = 'apple_pay',
  LINK = 'link',
}

export interface PaymentMethodSummaryDto {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  wallet: PaymentWalletType | null;
}

export interface ChangePlanPreviewDto {
  currentPlan: PaidTier;
  targetPlan: PaidTier;
  monthlyAmount: number;
  currentMonthlyAmount: number;
  prorationAmount: number;
  prorationCharge: number;
  prorationCredit: number;
  nextInvoiceTotal: number;
  nextInvoiceDate: string | null;
  periodStart: string | null;
  card: PaymentMethodSummaryDto | null;
}

export interface PaymentMethodOverviewDto {
  card: PaymentMethodSummaryDto | null;
  nextInvoiceAmount: number | null;
  nextInvoiceDate: string | null;
}

export interface BillingOverviewDto {
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  currentPeriodEnd: string | null;
  pendingTier: PaidTier | null;
  monthlyAmount: number | null;
  paymentMethod: PaymentMethodSummaryDto | null;
  nextInvoiceDate: string | null;
}

export enum InvoiceStatus {
  PAID = 'PAID',
  OPEN = 'OPEN',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export interface BillingInvoiceDto {
  id: string;
  createdAt: string;
  tier: PaidTier | null;
  amount: number;
  status: InvoiceStatus;
  url: string | null;
}

export interface BillingConfigDto {
  publishableKey: string;
}

export enum PaymentIntentKind {
  PAYMENT = 'PAYMENT',
  SETUP = 'SETUP',
}

export interface SubscriptionPaymentDto {
  clientSecret: string;
  kind: PaymentIntentKind;
}

export enum PromotionDuration {
  ONCE = 'ONCE',
  REPEATING = 'REPEATING',
  FOREVER = 'FOREVER',
}

export interface PromotionCodeDto {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: PromotionDuration;
  durationInMonths: number | null;
}
