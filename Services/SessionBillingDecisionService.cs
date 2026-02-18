using reframe.Models;

namespace reframe.Services;

public interface ISessionBillingDecisionService
{
    SessionBillingResult Decide(SessionBillingInput input);
}

public class SessionBillingDecisionService : ISessionBillingDecisionService
{
    public SessionBillingResult Decide(SessionBillingInput input)
    {
        if (!ShouldEvaluateAtThisMoment(input))
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.DoNotCharge,
                DecisionReason = "charge_moment_not_reached_for_policy"
            };
        }

        var cancellationDecision = TryDecideCancellation(input);
        if (cancellationDecision is not null)
        {
            return cancellationDecision;
        }

        if (input.Package.HasActivePackage && input.Package.RemainingSessions > 0)
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.ConsumePackage,
                DecisionReason = "active_package_with_remaining_sessions"
            };
        }

        return new SessionBillingResult
        {
            Decision = ChargeDecision.Charge,
            DecisionReason = "no_active_package_or_zero_balance"
        };
    }

    private static bool ShouldEvaluateAtThisMoment(SessionBillingInput input)
    {
        if (input.Policy.ChargeTiming == ChargeTiming.BeforeSession)
        {
            return input.DecisionAtUtc <= input.SessionStartUtc || IsFinalizedSession(input.SessionStatus);
        }

        return IsFinalizedSession(input.SessionStatus) || input.DecisionAtUtc >= input.SessionStartUtc;
    }

    private static bool IsFinalizedSession(SessionStatus sessionStatus)
    {
        return sessionStatus is SessionStatus.Completed
            or SessionStatus.CanceledByPatient
            or SessionStatus.CanceledByTherapist
            or SessionStatus.NoShowPatient
            or SessionStatus.NoShowTherapist;
    }

    private static SessionBillingResult? TryDecideCancellation(SessionBillingInput input)
    {
        if (input.SessionStatus == SessionStatus.CanceledByTherapist)
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.DoNotCharge,
                DecisionReason = "therapist_canceled_session"
            };
        }

        if (input.SessionStatus == SessionStatus.NoShowTherapist)
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.DoNotCharge,
                DecisionReason = "therapist_no_show"
            };
        }

        if (input.SessionStatus != SessionStatus.CanceledByPatient)
        {
            return null;
        }

        var hoursUntilSessionStart = (input.SessionStartUtc - input.DecisionAtUtc).TotalHours;
        if (hoursUntilSessionStart >= input.Policy.FreeCancellationWindowHours)
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.DoNotCharge,
                DecisionReason = "patient_canceled_within_free_window"
            };
        }

        if (input.Package.HasActivePackage && input.Package.RemainingSessions > 0)
        {
            return new SessionBillingResult
            {
                Decision = ChargeDecision.ConsumePackage,
                DecisionReason = "patient_canceled_outside_free_window_consumed_package"
            };
        }

        return new SessionBillingResult
        {
            Decision = ChargeDecision.Charge,
            DecisionReason = "patient_canceled_outside_free_window"
        };
    }
}
