import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGetRegistrationFormQuery,
  useInsertCandidateMutation,
} from "../modules/admin_slice";

export type FormValues = {
  name: string;
  email: string;
  mobile: string;
  degree: string;
  department: string;
  degree_percentage: number;
  sslc_percentage: number;
  hsc_percentage: number;
  location: string;
  relocate: "Yes" | "No" | null;
};

const CandidateRegistrationPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      relocate: null,
    },
  });

  const selectedDegree = watch("degree");
  const { registerId: formId } = useParams();
  const [candidateRegister] = useInsertCandidateMutation();
  const { data: formData, isLoading } = useGetRegistrationFormQuery(
    formId ?? ""
  );
  const [formSubmitted, setFormSubmitted] = useState(false);

  const departmentOptions: Record<string, string[]> = {
    "B.E": ["IT", "CSE", "ECE"],
    "B.Sc": ["IT", "CSE"],
    "M.Sc": ["IT", "CSE"],
    "B.Tech": ["IT", "CSE", "ECE"],
    Other: ["MCA"],
  };

  useEffect(() => {
    reset((prevValues) => ({
      ...prevValues,
      department: "",
    }));
  }, [selectedDegree, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await candidateRegister({
        tableType: "Registration",
        formId: formId!,
        candidate: data,
      }).unwrap();
      setFormSubmitted(true);
      reset();
    } catch (err: any) {
      if (err?.data?.error === "Email already exists") {
        setError("email", {
          type: "manual",
          message: "Email already exists",
        });
      } else if (err?.data?.error === "Mobile number already exists") {
        setError("mobile", {
          type: "manual",
          message: "Mobile number already exists",
        });
      } else {
        console.error("Unexpected error", err);
      }
    }
  };

  if (isLoading) return null;

  if (formData?.status !== "active") {
    return (
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
        <Alert severity="error" sx={{ width: "100%" }}>
          Invalid or expired Link.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: { xs: "90%", sm: "400px", md: "450px" },
        padding: "30px",
        mt: "50px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        backgroundColor: "white",
        mx: "auto",
      }}
    >
      {formSubmitted ? (
        <Alert severity="success" sx={{ fontSize: "1rem" }}>
          Registration successful!
        </Alert>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333" }}>
            {formData.label}
          </Typography>
          {/* <Typography variant="body2">{formData.description}</Typography> */}
          <Box
            component="ol"
            sx={{
              m: 0,
              listStyle: "none",
              background: "#b7def4",
              borderRadius: "20px",
              padding: "10px",
            }}
          >
            {formData.description
              .split("\n")
              .filter((line) => line.trim() !== "")
              .map((line, index) => (
                <li key={index}>
                  <Typography variant="body2">{line}</Typography>
                </li>
              ))}
          </Box>

          <TextField
            label="Name"
            {...register("name", { required: "Name is required" })}
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <TextField
            label="Email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
                message:
                  "Email must be a valid Gmail address (e.g. user@gmail.com)",
              },
            })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label="Mobile"
            type="tel"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">+91</InputAdornment>
              ),
            }}
            {...register("mobile", {
              required: "Mobile number is required",
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: "Enter valid 10-digit mobile number",
              },
            })}
            error={!!errors.mobile}
            helperText={errors.mobile?.message}
          />

          <FormControl fullWidth error={!!errors.degree}>
            <InputLabel>Degree</InputLabel>
            <Select
              label="Degree"
              defaultValue=""
              {...register("degree", { required: "Degree is required" })}
            >
              <MenuItem value="B.E">B.E</MenuItem>
              <MenuItem value="B.Tech">B.Tech</MenuItem>
              <MenuItem value="B.Sc">B.Sc</MenuItem> {/* Add this */}
              <MenuItem value="M.Sc">M.Sc</MenuItem> {/* Add this */}
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            error={!!errors.department}
            disabled={!selectedDegree}
          >
            <InputLabel>Department</InputLabel>
            <Select
              label="Department"
              defaultValue=""
              {...register("department", {
                required: "Department is required",
              })}
            >
              {!selectedDegree ? (
                <MenuItem value="" disabled>
                  Select degree first
                </MenuItem>
              ) : (
                departmentOptions[selectedDegree]?.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.department && (
              <Typography color="error" fontSize="0.875rem">
                {errors.department.message}
              </Typography>
            )}
          </FormControl>

          <TextField
            label="Degree Percentage"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            {...register("degree_percentage", {
              required: "Degree percentage is required",
              min: { value: 0, message: "Minimum is 0%" },
              max: { value: 100, message: "Maximum is 100%" },
              validate: (value) =>
                !value.toString().includes("%") || "Do not include % symbol",
            })}
            error={!!errors.degree_percentage}
            helperText={errors.degree_percentage?.message}
          />

          <TextField
            label="SSLC Percentage"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            {...register("sslc_percentage", {
              required: "SSLC percentage is required",
              min: { value: 0, message: "Minimum is 0%" },
              max: { value: 100, message: "Maximum is 100%" },
              validate: (value) =>
                !value.toString().includes("%") || "Do not include % symbol",
            })}
            error={!!errors.sslc_percentage}
            helperText={errors.sslc_percentage?.message}
          />

          <TextField
            label="HSC Percentage"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            {...register("hsc_percentage", {
              required: "HSC percentage is required",
              min: { value: 0, message: "Minimum is 0%" },
              max: { value: 100, message: "Maximum is 100%" },
              validate: (value) =>
                !value.toString().includes("%") || "Do not include % symbol",
            })}
            error={!!errors.hsc_percentage}
            helperText={errors.hsc_percentage?.message}
          />

          <TextField
            label="Location"
            {...register("location", { required: "Location is required" })}
            error={!!errors.location}
            helperText={errors.location?.message}
          />

          <Typography sx={{ fontWeight: "500" }}>
            {`Are you ready to relocate to ${formData.branch}?`}
          </Typography>

          <Controller
            name="relocate"
            control={control}
            rules={{ required: "Please choose an option" }}
            render={({ field }) => (
              <RadioGroup row {...field}>
                <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="No" control={<Radio />} label="No" />
              </RadioGroup>
            )}
          />
          {errors.relocate && (
            <Typography color="error" fontSize="0.875rem">
              {errors.relocate.message}
            </Typography>
          )}

          <Button type="submit" variant="contained" fullWidth>
            Register
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CandidateRegistrationPage;
