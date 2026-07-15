"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  getPublicFeedbackSurvey,
  submitPublicFeedbackSurvey,
} from "@/api/feedback";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PublicSurveyPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const surveyQuery = useQuery({
    queryKey: ["public-feedback", token],
    queryFn: () => getPublicFeedbackSurvey(token!),
    enabled: Boolean(token),
  });

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const submitMutation = useMutation({
    mutationFn: () =>
      submitPublicFeedbackSurvey(token!, {
        score: score ?? 0,
        comment: comment.trim() || undefined,
      }),
    onSuccess: async () => {
      await surveyQuery.refetch();
    },
  });

  const status = useMemo(() => {
    if (!surveyQuery.data) return "loading";
    if (surveyQuery.data.survey.status === "COMPLETED") return "completed";
    if (surveyQuery.data.survey.status === "EXPIRED") return "expired";
    return "open";
  }, [surveyQuery.data]);

  if (surveyQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-xl p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
          <p className="mt-4 text-sm text-slate-600">Loading your survey...</p>
        </Card>
      </div>
    );
  }

  if (surveyQuery.isError || !surveyQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-xl p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Unable to open survey</h1>
          <p className="mt-2 text-sm text-slate-600">
            {getErrorMessage(surveyQuery.error, "Please verify your survey link.")}
          </p>
        </Card>
      </div>
    );
  }

  const payload = surveyQuery.data;
  const options = Array.from(
    { length: payload.scoring.max - payload.scoring.min + 1 },
    (_, index) => payload.scoring.min + index
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0)] p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-slate-300/70 bg-white/95 p-6 shadow-xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{payload.company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {payload.survey.type === "CSAT" ? "How satisfied are you?" : "How likely are you to recommend us?"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Hi {payload.customer.firstName}, this should only take a few seconds.
          </p>

          {status === "completed" && (
            <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">Feedback already submitted</p>
              </div>
              <p className="mt-2 text-sm text-emerald-800">Thanks again for your response.</p>
            </div>
          )}

          {status === "expired" && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">This survey has expired.</p>
              <p className="mt-1 text-sm text-amber-700">Please contact support if you still want to share feedback.</p>
            </div>
          )}

          {status === "open" && (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (score === null || submitMutation.isPending) return;
                submitMutation.mutate();
              }}
            >
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Score</p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                  {options.map((value) => {
                    const selected = score === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setScore(value)}
                        className={`h-11 rounded-lg border text-sm font-semibold transition ${
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {score !== null
                    ? payload.scoring.labels[score] ?? ""
                    : `Select a score from ${payload.scoring.min} to ${payload.scoring.max}`}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="comment">
                  Optional comment
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-600"
                  placeholder="Tell us what went well or what we should improve"
                />
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-red-600">
                  {getErrorMessage(submitMutation.error, "Unable to submit feedback.")}
                </p>
              )}

              <Button
                type="submit"
                disabled={score === null || submitMutation.isPending}
                aria-disabled={score === null || submitMutation.isPending}
                aria-busy={submitMutation.isPending}
                className="h-11 px-5"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit feedback"
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
