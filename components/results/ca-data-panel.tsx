"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CaData } from "@/types/review"

function CaSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <span className="text-sm font-medium">{title}</span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(value: unknown): string {
  if (typeof value === "number") {
    return `RM ${value.toLocaleString()}K`
  }
  return String(value ?? "-")
}

function formatMultiple(value: unknown): string {
  if (typeof value === "number") {
    return `${value}x`
  }
  return String(value ?? "-")
}

interface CaDataPanelProps {
  readonly caData: CaData
}

export function CaDataPanel({ caData }: CaDataPanelProps) {
  const basicInfo = (caData.A_basic_information ?? {}) as Record<string, unknown>
  const borrowerProfile = (caData.B_borrower_profile ?? {}) as Record<string, unknown>
  const facilities = (caData.E_facilities ?? {}) as Record<string, unknown>
  const securities = (caData.F_securities ?? {}) as Record<string, unknown>
  const groupExposure = (caData.G_group_exposure ?? {}) as Record<string, unknown>
  const financialSummaries = (caData.I_financial_summaries ?? []) as Record<
    string,
    unknown
  >[]
  const keyCreditIssues = (caData.K_key_credit_issues ?? []) as Record<
    string,
    unknown
  >[]
  const termsAndConditions = (caData.M_terms_and_conditions ?? {}) as Record<
    string,
    unknown
  >
  const mccDecision = (caData.N_mcc_decision ?? {}) as Record<string, unknown>
  const applicationRequests = (caData.O_application_requests ?? []) as Record<
    string,
    unknown
  >[]

  return (
    <div role="tabpanel" className="flex-1 overflow-y-auto">
      <CaSection title="Basic Information" defaultOpen>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-muted-foreground">Group Name</div>
          <div>{(basicInfo.group_name as string) || "-"}</div>
          <div className="text-muted-foreground">Borrower(s)</div>
          <div>
            {Array.isArray(basicInfo.borrower_names)
              ? (basicInfo.borrower_names as string[]).join(", ")
              : "-"}
          </div>
          <div className="text-muted-foreground">CA Reference</div>
          <div>{(basicInfo.ca_reference_no as string) || "-"}</div>
          <div className="text-muted-foreground">CA Date</div>
          <div>{(basicInfo.ca_date as string) || "-"}</div>
          <div className="text-muted-foreground">Application Type</div>
          <div>{(basicInfo.application_type as string) || "-"}</div>
          <div className="text-muted-foreground">Account Status</div>
          <div>{(basicInfo.account_status as string) || "-"}</div>
          <div className="text-muted-foreground">Relationship Since</div>
          <div>{(basicInfo.relationship_since as string) || "-"}</div>
          <div className="text-muted-foreground">Relationship Strategy</div>
          <div>{(basicInfo.relationship_strategy as string) || "-"}</div>
          <div className="text-muted-foreground">Next Review Expiry</div>
          <div>{(basicInfo.next_review_expiry as string) || "-"}</div>
        </div>
      </CaSection>

      <CaSection title="Borrower Profile">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-muted-foreground">Principal Activity</div>
          <div>{(borrowerProfile.principal_activity as string) || "-"}</div>
          <div className="text-muted-foreground">Industry Sector</div>
          <div>{(borrowerProfile.industry_sector as string) || "-"}</div>
          <div className="text-muted-foreground">Year Commenced</div>
          <div>{(borrowerProfile.year_commenced as number) || "-"}</div>
          <div className="text-muted-foreground">SME</div>
          <div>{String(borrowerProfile.is_sme) || "-"}</div>
          <div className="text-muted-foreground">CRR Existing</div>
          <div>{(borrowerProfile.crr_existing as string) || "-"}</div>
          <div className="text-muted-foreground">CRR Proposed</div>
          <div>{(borrowerProfile.crr_proposed as string) || "-"}</div>
          <div className="text-muted-foreground">ESG Rating</div>
          <div>{(borrowerProfile.esg_rating_proposed as string) || "-"}</div>
          <div className="text-muted-foreground">BNM Classification</div>
          <div>
            {(borrowerProfile.bnm_classification_proposed as string) || "-"}
          </div>
        </div>
      </CaSection>

      <CaSection title="Application Requests">
        {applicationRequests.map((req, idx) => (
          <div key={idx} className="mb-3 last:mb-0">
            <div className="mb-1 text-xs font-medium">
              Request {idx + 1}: {req.request_type as string}
            </div>
            <p className="text-xs text-muted-foreground">
              {req.description as string}
            </p>
          </div>
        ))}
      </CaSection>

      <CaSection title="Facilities">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 border-b pb-2 text-xs font-medium">
            <div>Facility</div>
            <div className="text-right">Limit (RM)</div>
            <div className="text-right">Outstanding (RM)</div>
          </div>
          {(facilities.facility_items as Record<string, unknown>[])?.map(
            (item, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="font-medium">
                    {item.facility_label as string}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.facility_type as string}
                  </div>
                </div>
                <div className="text-right font-mono">
                  {formatCurrency(item.total_limit_rm)}
                </div>
                <div className="text-right font-mono">
                  {formatCurrency(item.outstanding_rm)}
                </div>
              </div>
            )
          )}
          <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs font-medium">
            <div>Total</div>
            <div className="text-right font-mono">
              {formatCurrency(facilities.total_proposed_rm)}
            </div>
            <div className="text-right font-mono">
              {formatCurrency(facilities.total_outstanding_rm)}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Secured</span>
            <span className="font-mono">
              {formatCurrency(facilities.total_security_value_rm)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Unsecured</span>
            <span className="font-mono">
              {formatCurrency(facilities.total_unsecured_rm)}
            </span>
          </div>
        </div>
      </CaSection>

      <CaSection title="Securities">
        <div className="space-y-2">
          {(securities.security_items as Record<string, unknown>[])?.map(
            (item, idx) => (
              <div key={idx} className="rounded bg-muted/30 p-2 text-xs">
                <div className="flex items-start justify-between">
                  <span className="font-medium">
                    {item.security_type as string}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    {item.security_status as string}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {item.description as string}
                </p>
                {typeof item.secured_against_facility === "string" &&
                  item.secured_against_facility && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Secured against: {item.secured_against_facility}
                    </p>
                  )}
              </div>
            )
          )}
        </div>
      </CaSection>

      <CaSection title="Group Exposure">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-muted-foreground">Grand Total</div>
          <div className="font-mono font-medium">
            {formatCurrency(groupExposure.grand_total_rm)}
          </div>
          <div className="text-muted-foreground">Secured Exposure</div>
          <div className="font-mono">
            {formatCurrency(groupExposure.secured_exposure_rm)}
          </div>
          <div className="text-muted-foreground">Unsecured Exposure</div>
          <div className="font-mono">
            {formatCurrency(groupExposure.unsecured_exposure_rm)}
          </div>
          <div className="text-muted-foreground">Total FEC/CCS/IRS</div>
          <div className="font-mono">
            {formatCurrency(groupExposure.total_fec_ccs_irs_rm)}
          </div>
        </div>
      </CaSection>

      <CaSection title="Financial Summary">
        {financialSummaries?.map((entity, idx) => (
          <div key={idx} className="mb-4 last:mb-0">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span>{entity.entity_name as string}</span>
              <span className="font-normal text-muted-foreground">
                {entity.entity_role as string}
              </span>
            </div>
            {(entity.periods as Record<string, unknown>[])
              ?.slice(0, 2)
              .map((period, pIdx) => (
                <div
                  key={pIdx}
                  className="mb-2 rounded bg-muted/30 p-2 text-xs"
                >
                  <div className="mb-1 text-[10px] text-muted-foreground">
                    {period.fye_date as string} (
                    {period.account_status as string})
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-muted-foreground">Revenue</div>
                    <div className="font-mono">
                      {formatCurrency(period.revenue_rm)}
                    </div>
                    <div className="text-muted-foreground">PBT</div>
                    <div className="font-mono">
                      {formatCurrency(period.pbt_rm)}
                    </div>
                    <div className="text-muted-foreground">PAT</div>
                    <div className="font-mono">
                      {formatCurrency(period.pat_rm)}
                    </div>
                    <div className="text-muted-foreground">EBITDA</div>
                    <div className="font-mono">
                      {formatCurrency(period.ebitda_rm)}
                    </div>
                    <div className="text-muted-foreground">TNW</div>
                    <div className="font-mono">
                      {formatCurrency(period.tangible_net_worth_rm)}
                    </div>
                    <div className="text-muted-foreground">Total Debt</div>
                    <div className="font-mono">
                      {formatCurrency(period.total_debt_rm)}
                    </div>
                    <div className="text-muted-foreground">Gearing</div>
                    <div className="font-mono">
                      {formatMultiple(period.gearing_times)}
                    </div>
                    <div className="text-muted-foreground">DSCR</div>
                    <div className="font-mono">
                      {formatMultiple(period.dscr_times)}
                    </div>
                    <div className="text-muted-foreground">Interest Cover</div>
                    <div className="font-mono">
                      {formatMultiple(period.interest_cover_times)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </CaSection>

      <CaSection title="Key Credit Issues">
        {keyCreditIssues?.map((issue, idx) => (
          <div key={idx} className="mb-3 rounded bg-muted/30 p-2 last:mb-0">
            <div className="text-xs font-medium">
              {String(issue.issue_number ?? "")}. {issue.issue_title as string}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {issue.description as string}
            </p>
            <div className="mt-1">
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                {issue.risk_area as string}
              </span>
            </div>
            {typeof issue.mitigant === "string" && issue.mitigant && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                Mitigant: {issue.mitigant}
              </p>
            )}
          </div>
        ))}
      </CaSection>

      <CaSection title="Terms & Conditions">
        <div className="space-y-4">
          {[
            "existing_pre_drawdown",
            "existing_post_drawdown",
            "new_pre_drawdown",
            "new_post_drawdown",
            "internal_conditions",
          ].map((category) => {
            const items = termsAndConditions[category] as
              | Record<string, unknown>[]
              | null
            if (!items?.length) return null
            return (
              <div key={category}>
                <div className="mb-1.5 text-xs font-medium capitalize">
                  {category.replace(/_/g, " ")}
                </div>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="mb-1 rounded bg-muted/30 p-2 text-xs last:mb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1">{item.condition as string}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                          item.status === "Complied"
                            ? "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                            : item.status === "Breached"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {item.status as string}
                      </span>
                    </div>
                    {typeof item.applicable_facility === "string" &&
                      item.applicable_facility && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Facility: {item.applicable_facility}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            )
          })}
          {(() => {
            const exceptions = termsAndConditions.policy_exceptions as
              | string[]
              | null
            if (!exceptions?.length) return null
            return (
              <div>
                <div className="mb-1.5 text-xs font-medium">
                  Policy Exceptions
                </div>
                {exceptions.map((ex, idx) => (
                  <div
                    key={idx}
                    className="mb-1 rounded bg-muted/30 p-2 text-xs last:mb-0"
                  >
                    {ex}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </CaSection>

      <CaSection title="MCC Decision">
        <div className="py-2 text-center">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              mccDecision.decision === "Approved"
                ? "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            )}
          >
            {mccDecision.decision as string}
          </div>
          {typeof mccDecision.decision_remarks === "string" &&
            mccDecision.decision_remarks && (
              <p className="mt-2 text-xs text-muted-foreground">
                {mccDecision.decision_remarks}
              </p>
            )}
        </div>
      </CaSection>
    </div>
  )
}
