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
  Alert,
} from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import AgreeToTermsDialog from "../components/AgreeToTermsDialog";
import {
  useAddSubmissionMutation,
  useEditSubmissionMutation,
  useGetCandidateSubmissionQuery,
  useGetFieldsByCandidateFormIdQuery,
  useGetFormByIdQuery,
  useUpdateTimerMutation,
} from "../modules/candidate_slice";
import { useParams } from "react-router-dom";
import { useLogoutCandidateMutation } from "../modules/candidate_slice";
import { v4 as uuid } from "uuid";
import { useCandidate } from "../context/CandidateContext";

const AssessmentPage = () => {
  const { email, setAuth } = useCandidate();
  const { formId } = useParams();
  const [fields, setFields] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { data } = useGetFieldsByCandidateFormIdQuery(formId ?? "");
  const { data: formData } = useGetFormByIdQuery(formId ?? "");
  const [logoutCandidate] = useLogoutCandidateMutation();
  const [endSubmit] = useEditSubmissionMutation();
  const savedAnswers = localStorage.getItem(`answers_${formId}`);
  const initialData = savedAnswers ? JSON.parse(savedAnswers) : {};
  const [startSubmit, { data: submissionResponse }] =
    useAddSubmissionMutation();
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [updateTimer] = useUpdateTimerMutation();

  if (submissionResponse?.responseId) {
    localStorage.setItem("responseId", submissionResponse.responseId);
  }
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAgree = useCallback(async () => {
    if (termsAccepted) {
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
        localStorage.setItem("hasStartTime", "true");
        setOpenDialog(false);
      } catch (err) {
        console.error("Failed to record start time", err);
      }
    } else {
      alert("Please accept the terms to continue.");
    }
  }, [termsAccepted, formId, startSubmit]);

  const submissionId = localStorage.getItem("responseId");
  const { data: candidateData } = useGetCandidateSubmissionQuery(
    submissionId ?? "",
    {
      skip: !submissionId,
    }
  );

  useEffect(() => {
    if (!candidateData?.startTime || !formData?.duration) return;

    const [startHour = 0, startMinute = 0, startSecond = 0] =
      candidateData.startTime.split(":").map(Number);
    const [durationMinutes = 0, durationSeconds = 0] = formData.duration
      .split(":")
      .map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, startSecond, 0);
    const endDate = new Date(
      startDate.getTime() + (durationMinutes * 60 + durationSeconds) * 1000
    );

    const interval = setInterval(() => {
      const now = new Date();
      let diffMs = endDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setElapsedTime("00:00");
        clearInterval(interval);
        handleSubmit(onSubmit)();
        return;
      }

      setElapsedTime(formatDuration(diffMs));

      updateTimer({
        formId: candidateData.formId,
        userEmail: candidateData.userEmail,
        Timer: formatDuration(diffMs),
      });
    });

    return () => clearInterval(interval);
  }, [candidateData, formData]);

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: initialData,
  });

  const handleLogout = async () => {
    try {
      await logoutCandidate().unwrap();
      localStorage.removeItem("candidateToken");
      localStorage.removeItem("responseId");
      setAuth({ email: null, authorized: null });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };
  const [submitted, setSubmitted] = useState<boolean | null>(false);

  const watchedValues = watch();
  useEffect(() => {
    if (Object.keys(watchedValues).length > 0) {
      localStorage.setItem(`answers_${formId}`, JSON.stringify(watchedValues));
    }
  }, [watchedValues, formId]);

  useEffect(() => {
    if (data) {
      setFields(data);
    }
    if (candidateData?.termsAccepted === "true") {
      setOpenDialog(false);
    }
  }, [data, candidateData]);

  const handleTermsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTermsAccepted(event.target.checked);
  };

  const onSubmit = async (data: any) => {
    const result: Record<string, any> = {};

    fields.forEach((field, index) => {
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
    const formattedTime = now.toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const [startHour, startMinute, startSecond] = (
      candidateData?.startTime || "00:00:00"
    )
      .split(":")
      .map(Number);
    const [endHour, endMinute, endSecond] = formattedTime
      .split(":")
      .map(Number);

    const startDate = new Date(1970, 0, 1, startHour, startMinute, startSecond);
    const endDate = new Date(1970, 0, 1, endHour, endMinute, endSecond);

    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    const duration = `${totalMinutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

    try {
      await endSubmit({
        formId: candidateData?.formId ?? "",
        userEmail: candidateData?.userEmail ?? "",
        status: "submitted",
        endTime: formattedTime,
        duration,
        value: result,
      }).unwrap();

      setSubmitted(true);
      handleLogout();
    } catch (err) {
      console.error("Failed to submit test", err);
    }
  };

  const toRoman = (num: number) => {
    const romanNumerals: string[] = [
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

  if (openDialog && candidateData?.termsAccepted !== "true") {
    return (
      <AgreeToTermsDialog
        open={openDialog}
        onClose={() => {}}
        onAgree={handleAgree}
        termsAccepted={termsAccepted}
        handleTermsChange={handleTermsChange}
      />
    );
  }

  return (
    <Container maxWidth="md">
      {submitted ? (
        <Box
          sx={{
            width: { xs: "90%", sm: "400px", md: "450px" },
            padding: "40px",
            mt: "50px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            backgroundColor: "white",
            mx: "auto",
          }}
        >
          <Alert severity="success" sx={{ width: "100%" }}>
            {"Test Successfully submitted"}
          </Alert>
        </Box>
      ) : (
        <>
          <Box
            p={4}
            mt={{ xs: 8, sm: 0, md: 7 }}
            sx={{ backgroundColor: "#f9f9f9", borderRadius: 2 }}
            component="form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Assessment
            </Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Time Elapsed: {elapsedTime}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {fields.map((field, index) => (
              <Box key={field.id || index} my={3}>
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
                    {...register(`field_${index}`)}
                  />
                ) : field.type === "textArea" ? (
                  <TextField
                    placeholder={field.placeholder || ""}
                    fullWidth
                    multiline
                    rows={10}
                    variant="outlined"
                    size="small"
                    {...register(`field_${index}`)}
                  />
                ) : field.type === "radio" ? (
                  <Controller
                    name={`field_${index}`}
                    control={control}
                    defaultValue=""
                    render={({ field: radioField }) => (
                      <RadioGroup {...radioField}>
                        {(Array.isArray(field.options)
                          ? field.options
                          : []
                        ).map((opt: string, idx: number) => (
                          <FormControlLabel
                            key={idx}
                            value={opt}
                            control={<Radio />}
                            label={opt}
                          />
                        ))}
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
                      dangerouslySetInnerHTML={{
                        __html: field.rta?.content || "",
                      }}
                    />
                    {field.rta?.questions?.length > 0 && (
                      <Box sx={{ paddingX: "16px" }}>
                        {field.rta.questions.map(
                          (question: string, qIndex: number) => (
                            <Box key={qIndex} sx={{ marginBottom: "16px" }}>
                              <Typography variant="body1" fontWeight="bold">
                                {toRoman(qIndex + 1)}. {question}
                              </Typography>
                              <TextField
                                placeholder={`Your answer for ${toRoman(
                                  qIndex + 1
                                )}`}
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                size="small"
                                {...register(
                                  `field_${index}_question_${qIndex}`
                                )}
                              />
                            </Box>
                          )
                        )}
                      </Box>
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
              <Button variant="contained" color="success" type="submit">
                Submit
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Container>
  );
};

export default AssessmentPage;
