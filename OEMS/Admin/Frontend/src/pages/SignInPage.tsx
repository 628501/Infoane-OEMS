import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/GlobalContext";
import { loginUser } from "../Services/adminService";

type FormValues = {
  email: string;
  password: string;
};

const SignInPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  const [showPassword, setShowPassword] = useState(false);
  const [existError, setExistError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailValue = watch("email");
  const passwordValue = watch("password");
  const { setAuth } = useAuth();

  useEffect(() => {
    if (existError) {
      setExistError("");
    }
  }, [emailValue, passwordValue]);

  const handleForgotPassword = () => {
    navigate("/forget-password");
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    const { email, password } = data;
    try {
      const result = await loginUser(email, password);
      setAuth({ isAdmin: true, name: result.name, email: result.email, userId: result.userId });
      setExistError("");
      reset();
      navigate("/dashboard");
      toast.success("Sign in Successful!");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Invalid email or password";
      setExistError(message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: { xs: "90%", sm: "400px", md: "450px" },
        height: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "20px",
        padding: "40px",
        marginTop: "50px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        backgroundColor: "white",
        mx: "auto",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
        Admin Login
      </Typography>
      <TextField
        sx={{ width: "100%" }}
        id="email"
        type="email"
        label="Email"
        variant="outlined"
        placeholder="Your email"
        {...register("email", {
          required: "Email is required",
          pattern: {
            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
            message: "Invalid email format",
          },
        })}
        error={!!errors.email || !!existError}
        helperText={errors.email?.message || existError}
      />
      <TextField
        sx={{ width: "100%" }}
        id="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        variant="outlined"
        placeholder="Your password"
        {...register("password", { required: "Password is required" })}
        error={!!errors.email || !!existError}
        helperText={errors.password?.message || existError}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={togglePasswordVisibility}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Typography
          sx={{
            color: "#007bff",
            cursor: "pointer",
          }}
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </Typography>
      </Box>
      <Button
        sx={{ width: "100%", padding: "12px", fontSize: "16px" }}
        variant="contained"
        color="primary"
        type="submit"
        disabled={loading}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: "white" }} />
        ) : (
          "Sign in"
        )}
      </Button>
      <Typography>
        Don't have an account?{" "}
        <span
          onClick={() => navigate("/sign-up")}
          style={{
            fontSize: "14px",
            color: "#007bff",
            cursor: "pointer",
          }}
        >
          Sign Up
        </span>
      </Typography>
    </Box>
  );
};

export default SignInPage;
