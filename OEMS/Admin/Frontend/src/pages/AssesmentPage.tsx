import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  useAddSubmissionMutation,
  useEditSubmissionMutation,
  useGetCandidateSubmissionQuery,
  useGetFieldsByCandidateFormIdQuery,
  useGetFormByIdQuery,
  useGetStartTimeQuery,
  useUpdateWarningsMutation,
} from "../modules/candidate_slice";
import { useParams } from "react-router-dom";
import { useLogoutCandidateMutation } from "../modules/candidate_slice";
import { v4 as uuid } from "uuid";
import { useCandidate } from "../context/CandidateContext";
import { toast } from "react-toastify";
import {
  Box,
  Typography,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Button,
  Container,
} from "@mui/material";
import AgreeToTermsDialog from "../components/AgreeToTermsDialog";
import { TimerButton } from "../components/TimerButton";
import ConfirmationDialog from "../components/ConfirmationDialog";
import WarningDialog from "../components/WarningDialog";

const AssessmentPage = () => {
  const { email, setAuth } = useCandidate();
  const { formId } = useParams();
  const { data: fields, isLoading: isFieldsLoading } =
    useGetFieldsByCandidateFormIdQuery(formId ?? "");
  const { data: formData, isLoading: isFormLoading } = useGetFormByIdQuery(
    formId ?? ""
  );
  const [logoutCandidate] = useLogoutCandidateMutation();
  const [warningsUpdate] = useUpdateWarningsMutation();
  const [endSubmit] = useEditSubmissionMutation();
  const [startSubmit, { data: submissionResponse }] =
    useAddSubmissionMutation();
  const [openDialog, setOpenDialog] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const maxTabSwitches = 3;

  const submissionId = localStorage.getItem("responseId");
  const { data: candidateData } = useGetCandidateSubmissionQuery(
    { responseId: submissionId ?? "", formId: formId ?? "" },
    { skip: !submissionId }
  );
  const { data: startTimeData } = useGetStartTimeQuery({
    formId: formId,
    responseId: submissionId,
  });

  const { register, handleSubmit, control } = useForm();

  useEffect(() => {
    setTabSwitchCount(Number(candidateData?.warnings));
  }, [candidateData]);
  const submitForm = async () => {
    try {
      await handleSubmit(onSubmit)();
    } catch (error) {
      console.error("Submit failed", error);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "hidden" &&
        candidateData?.status !== "submitted"
      ) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        await warningsUpdate({
          formId: formId ?? "",
          userEmail: candidateData?.userEmail ?? email ?? "",
          warnings: newCount,
        });

        if (newCount > maxTabSwitches) {
          await submitForm();
        } else {
          if (!openDialog) {
            setWarningDialogOpen(true);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [tabSwitchCount, candidateData?.status, formId, submissionId, email]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (
        (e.ctrlKey && (key === "c" || key === "v" || key === "x")) ||
        key === "F11" ||
        key === "F12" ||
        key === "Escape" || (key === "Tab" && e.altKey)
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!openDialog) {
        toast.warn("Right-click is disabled during the assessment.");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.body.style.userSelect = "auto";
    };
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!openDialog) {
      toast.warn("Pasting is disabled during the assessment.");
    }
  };

  useEffect(() => {
    if (submissionResponse?.responseId) {
      localStorage.setItem("responseId", submissionResponse.responseId);
    }
  }, [submissionResponse]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!formData?.duration || !startTimeData?.startTime || !candidateData)
      return;

    const durationMs = Number(formData.duration) * 60 * 1000;
    const [startHour, startMinute, startSecond] = startTimeData.startTime
      .split(":")
      .map(Number);
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, startSecond, 0);

    const now = Date.now();
    const elapsedMs = now - startTime.getTime();
    const remainingMs = durationMs - elapsedMs;

    if (remainingMs <= 0 && candidateData.status !== "submitted") {
      setExpired(true);
      handleSubmitAssessment();
    }
  }, [formData, startTimeData, candidateData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (
      !formData?.duration ||
      !startTimeData?.startTime ||
      expired ||
      candidateData?.status === "submitted"
    )
      return;

    const durationMs = Number(formData.duration) * 60 * 1000;
    const [startHour, startMinute, startSecond] = startTimeData.startTime
      .split(":")
      .map(Number);
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, startSecond, 0);

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime.getTime();
      let remainingMs = durationMs - elapsedMs;

      if (remainingMs <= 0) {
        remainingMs = 0;
        setElapsedTime("00:00");
        setExpired(true);
        clearInterval(interval);
        handleSubmitAssessment();
        return;
      }
      const formattedTime = formatDuration(remainingMs);
      setElapsedTime(formattedTime);
    }, 1000);

    const initialElapsedMs = Date.now() - startTime.getTime();
    const initialRemainingMs = Math.max(durationMs - initialElapsedMs, 0);
    const initialFormatted = formatDuration(initialRemainingMs);
    setElapsedTime(initialFormatted);

    return () => clearInterval(interval);
  }, [formData?.duration, startTimeData?.startTime, candidateData, expired]);

  useEffect(() => {
    if (candidateData?.termsAccepted === "true") {
      setOpenDialog(false);
    }
  }, [candidateData]);

  const handleAgree = useCallback(async () => {
    if (!termsAccepted) {
      toast.error("Please accept the terms to continue.");
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      await startSubmit({
        formId: formId ?? "",
        data: {
          termsAccepted: "true",
          userEmail: email ?? "",
          startTime: formattedTime,
          responseId: uuid(),
        },
      }).unwrap();
      setOpenDialog(false);
    } catch (err) {
      console.error("Failed to record start time", err);
      toast.error("Failed to start assessment.");
    }
  }, [termsAccepted, formId, startSubmit, email]);

  const handleLogout = async () => {
    try {
      await logoutCandidate().unwrap();
      localStorage.removeItem("responseId");
      setAuth({ email: null, authorized: null });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Logout failed.");
    }
  };

  const handleSubmitAssessment = () => {
    setDeleteDialogOpen(false);
    handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: Record<string, any>) => {
    try {
      const result: Record<string, any> = {};
      (fields || []).forEach((field, index) => {
        if (field.type === "rta") {
          const questionsAndAnswers = field.rta?.questions?.map(
            (question: string, qIndex: number) => ({
              question,
              answer: data[`field_${index}_question_${qIndex}`],
            })
          );
          result[field.label] = questionsAndAnswers;
        } else {
          result[field.label] = data[`field_${index}`];
        }
      });

      const now = new Date();
      const [startHour, startMinute, startSecond] = (
        startTimeData?.startTime || "00:00:00"
      )
        .split(":")
        .map(Number);
      const actualStartTime = new Date();
      actualStartTime.setHours(startHour, startMinute, startSecond, 0);
      const durationMinutes = Number(formData?.duration);
      const allowedDurationMs = durationMinutes * 60 * 1000;
      const actualTimeTakenMs = now.getTime() - actualStartTime.getTime();

      if (
        actualTimeTakenMs > allowedDurationMs + 1000 &&
        candidateData?.status !== "submitted"
      ) {
        toast.error("Time limit exceeded. You are being logged out.");
        handleLogout();
        return;
      }

      const formattedTime = now.toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const totalSeconds = Math.floor(actualTimeTakenMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      const calculatedDuration = `${totalMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
      await endSubmit({
        formId: candidateData?.formId ?? "",
        userEmail: candidateData?.userEmail ?? "",
        status: "submitted",
        endTime: formattedTime,
        duration: calculatedDuration,
        value: result,
      }).unwrap();
      toast.success("Test submitted!");
      handleLogout();
    } catch (err) {
      console.error("Failed to submit test", err);
      toast.error("Submission failed. Please try again.");
    }
  };

  const toRoman = (num: number) => {
    const romanNumerals = [
      "i",
      "ii",
      "iii",
      "iv",
      "v",
      "vi",
      "vii",
      "viii",
      "ix",
      "x",
      "xi",
      "xii",
      "xiii",
      "xiv",
      "xv",
      "xvi",
      "xvii",
      "xviii",
      "xix",
      "xx",
    ];
    return romanNumerals[num - 1] || num.toString();
  };

  if (
    isFieldsLoading ||
    isFormLoading ||
    !fields ||
    !formData ||
    expired ||
    candidateData?.status === "submitted"
  ) {
    return null;
  }

  if (openDialog && candidateData?.termsAccepted !== "true") {
    return (
      <AgreeToTermsDialog
        open={openDialog}
        onClose={() => {
          handleLogout();
        }}
        onAgree={handleAgree}
        termsAccepted={termsAccepted}
        handleTermsChange={(event) => setTermsAccepted(event.target.checked)}
        instructions={formData.startContent ?? ""}
      />
    );
  }

  return (
    <Container maxWidth="md">
      <TimerButton elapsedTime={elapsedTime} />
      <Box
        p={4}
        mt={{ xs: 8, sm: 0, md: 7 }}
        sx={{ backgroundColor: "#f9f9f9", borderRadius: 2, userSelect: "none" }}
        component="form"
        onSubmit={(e) => e.preventDefault()}
      >
        <Typography variant="h4" gutterBottom fontWeight="bold">
          {formData.label ?? ""} Assessment
        </Typography>
        <Divider sx={{ my: 2 }} />
        {fields.map((field, index) => (
          <Box key={field.fieldId || index} my={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              {index + 1}. {field.label}
            </Typography>
            {field.type === "text" ? (
              <TextField
                type="text"
                placeholder={field.placeholder || ""}
                fullWidth
                variant="outlined"
                size="small"
                onPaste={handlePaste}
                {...register(`field_${index}`)}
              />
            ) : field.type === "textArea" ? (
              <>
                {field.textArea?.content && (
                  <Box
                    className="ck-content"
                    sx={{
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                      overflowX: "auto",
                      marginBottom: "20px",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: field.textArea?.content || "",
                    }}
                  />
                )}
                <TextField
                  placeholder={field.placeholder || ""}
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  size="small"
                  onPaste={handlePaste}
                  {...register(`field_${index}`)}
                />
              </>
            ) : field.type === "radio" ? (
              <Controller
                name={`field_${index}`}
                control={control}
                defaultValue=""
                render={({ field: radioField }) => (
                  <RadioGroup {...radioField}>
                    {(Array.isArray(field.options) ? field.options : []).map(
                      (opt, idx) => (
                        <FormControlLabel
                          key={idx}
                          value={opt}
                          control={<Radio />}
                          label={opt}
                        />
                      )
                    )}
                  </RadioGroup>
                )}
              />
            ) : field.type === "rta" ? (
              <Box>
                <Box
                  className="ck-content"
                  sx={{
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    overflowX: "auto",
                    marginBottom: "20px",
                  }}
                  dangerouslySetInnerHTML={{ __html: field.rta?.content || "" }}
                />
                {(field.rta?.questions || []).map(
                  (question: string, qIndex: number) => (
                    <Box key={qIndex} sx={{ marginBottom: "16px" }}>
                      <Typography variant="body1" fontWeight="bold">
                        {toRoman(qIndex + 1)}. {question}
                      </Typography>
                      <TextField
                        placeholder={`Your answer for ${toRoman(qIndex + 1)}`}
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        size="small"
                        onPaste={handlePaste}
                        {...register(`field_${index}_question_${qIndex}`)}
                      />
                    </Box>
                  )
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Unsupported field type
              </Typography>
            )}
          </Box>
        ))}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="success"
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={expired}
          >
            Submit
          </Button>
        </Box>
      </Box>
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDelete={handleSubmitAssessment}
        itemLabel="the test"
        confirmLabel="Submit"
        title="Submit Test"
        description="Are you sure you want to submit your test now?"
      />
      <WarningDialog
        open={warningDialogOpen}
        onClose={() => setWarningDialogOpen(false)}
        tabSwitchCount={tabSwitchCount}
        maxTabSwitches={maxTabSwitches}
      />
    </Container>
  );
};

export default AssessmentPage;
