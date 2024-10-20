import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import validator from "validator";
import axios from "axios";
import {
  CloseRounded,
  EmailRounded,
  Visibility,
  VisibilityOff,
  PasswordRounded,
} from "@mui/icons-material";
import { IconButton, Modal } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { loginFailure, loginStart, loginSuccess } from "../redux/userSlice";
import { openSnackbar } from "../redux/snackbarSlice";
import { signIn, findUserByEmail, resetPassword } from "../api/index";
import OTP from "./OTP";

const SignIn = ({ setSignInOpen, setSignUpOpen }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [Loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [values, setValues] = useState({
    password: "",
    showPassword: false,
  });

  const [showOTP, setShowOTP] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [samepassword, setSamepassword] = useState("");
  const [newpassword, setNewpassword] = useState("");
  const [confirmedpassword, setConfirmedpassword] = useState("");
  const [passwordCorrect, setPasswordCorrect] = useState(false);
  const [resetDisabled, setResetDisabled] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const dispatch = useDispatch();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userBlocked, setUserBlocked] = useState(false);
  const [needsOTPVerification, setNeedsOTPVerification] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [credentialError, setcredentialError] = useState("");
  const [otp, setOtp] = useState("");


  useEffect(() => {
    if (email !== "") validateEmail();
    if (validator.isEmail(email) && password.length > 5) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [email, password]);

  useEffect(() => {
    if (otpVerified && needsOTPVerification && apiResponse) {
      localStorage.setItem('token', apiResponse.data.token);
      dispatch(loginSuccess("Success"));
      setIsLoggedIn(true);
      setSignInOpen(false);
      dispatch(openSnackbar({
        message: "Logged In Successfully",
        severity: "success"
      }));
    }
  }, [otpVerified, needsOTPVerification, apiResponse]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!disabled) {
      dispatch(loginStart());
      setDisabled(true);
      setLoading(true);
      
      setUserBlocked(false);
      setNeedsOTPVerification(false);
      setcredentialError("");
  
      try {
        const res = await axios.post(
          `${isAdmin ? "http://localhost:3001/admin/signin" : "http://localhost:3001/user/signin"}`,
          { email, password }
        );

        setApiResponse(res);
        console.log(res);
  
        switch (res.status) {
          case 200:
            localStorage.setItem('token', res.data.token);
            dispatch(loginSuccess(res.data));
            setIsLoggedIn(true);
            setSignInOpen(false);
            dispatch(openSnackbar({
              message: "Logged In Successfully",
              severity: "success"
            }));
            break;
  
          case 401:
            setUserBlocked(true);
            dispatch(loginFailure());
            setcredentialError("Your account has been blocked. Please contact support.");
            dispatch(openSnackbar({
              message: "Account blocked",
              severity: "error"
            }));
            break;
  
          case 402:
            //give snackbar too
            dispatch(openSnackbar({
              message: "Please verify your account",
              severity: "success"
            }));
            setNeedsOTPVerification(true);
            setShowOTP(true);
            break;
  
          case 400:
            dispatch(loginFailure());
            setcredentialError(res.data.errors[0]);
            dispatch(openSnackbar({
              message: `Error: ${res.data.errors[0]}`,
              severity: "error"
            }));
            break;
  
          default:
            dispatch(loginFailure());
            setcredentialError(`Unexpected Error: ${res.data}`);
        }
      } catch (err) {
        console.log(err);
        if (err.response) {
          switch (err.response.status) {
            case 400:
              setcredentialError("Invalid credentials");
              break;
            case 401:
              setUserBlocked(true);
              setcredentialError("Your account has been blocked. Please contact support.");
              break;
            case 402:
              setNeedsOTPVerification(true);
              setShowOTP(true);
              break;
            default:
              setcredentialError(err.response.data.errors[0] || "An error occurred");
          }
        } else {
          setcredentialError("Network error. Please try again.");
        }
        
        dispatch(loginFailure());
        dispatch(openSnackbar({
          message: credentialError,
          severity: "error"
        }));
      } finally {
        setLoading(false);
        setDisabled(false);
      }
    }
  
    if (email === "" || password === "") {
      dispatch(openSnackbar({
        message: "Please fill all the fields",
        severity: "error"
      }));
    }
  };

  const validateEmail = () => {
    if (validator.isEmail(email)) {
      setEmailError("");
    } else {
      setEmailError("Enter a valid Email Id!");
    }
  };

  const validatePassword = () => {
    if (newpassword.length < 8) {
      setSamepassword("Password must be atleast 8 characters long!");
      setPasswordCorrect(false);
    } else if (newpassword.length > 16) {
      setSamepassword("Password must be less than 16 characters long!");
      setPasswordCorrect(false);
    } else if (
      !newpassword.match(/[a-z]/g) ||
      !newpassword.match(/[A-Z]/g) ||
      !newpassword.match(/[0-9]/g) ||
      !newpassword.match(/[^a-zA-Z\d]/g)
    ) {
      setPasswordCorrect(false);
      setSamepassword(
        "Password must contain atleast one lowercase, uppercase, number and special character!"
      );
    }
    else {
      setSamepassword("");
      setPasswordCorrect(true);
    }
  };

  useEffect(() => {
    if (newpassword !== "") validatePassword();
    if (
      passwordCorrect
      && newpassword === confirmedpassword
    ) {
      setSamepassword("");
      setResetDisabled(false);
    } else if (confirmedpassword !== "" && passwordCorrect) {
      setSamepassword("Passwords do not match!");
      setResetDisabled(true);
    }
  }, [newpassword, confirmedpassword]);


  const sendOtp = async () => {
    console.log('Sending OTP request...');

    if (!resetDisabled) {
      setResetDisabled(true);
      setLoading(true);

      try {
        const res = await axios.post("http://localhost:3001/user/reset", {
          email: email.trim(),
        });

        if (res.status === 200) {
          setShowOTP(true); // Show the OTP input field if successful
          setEmailError(""); // Clear any previous email errors
          dispatch(
            openSnackbar({
              message: "OTP sent to your email. Please check and verify.",
              severity: "success",
            })
          );
        }
      } catch (error) {
        setLoading(false);
        setResetDisabled(false);

        if (error.response) {
          const { status, data } = error.response;
          console.log('Error response data:', data);

          // Handle specific error messages from the backend
          if (status === 400) {
            setEmailError(data.errors ? data.errors[0] : "User not found!");
            dispatch(
              openSnackbar({
                message: data.errors ? data.errors[0] : "Request failed. Please try again.",
                severity: "error",
              })
            );
          } else if (status === 500) {
            dispatch(
              openSnackbar({
                message: "Oops! Something went wrong on the server side. Please try again later.",
                severity: "error",
              })
            );
          } else {
            setEmailError("An unexpected error occurred. Please try again.");
            dispatch(
              openSnackbar({
                message: "An unexpected error occurred. Please try again.",
                severity: "error",
              })
            );
          }
        } else {
          // Handle network or other unexpected errors
          console.error('Request failed:', error.message);
          dispatch(
            openSnackbar({
              message: error.message,
              severity: "error",
            })
          );
        }
      } finally {
        setLoading(false);
        setResetDisabled(false);
      }
    }
  };


  const performResetPassword = useCallback(async () => {
    if (otpVerified) {
      setShowOTP(false);
      setResettingPassword(true);
  
      try {
        const res = await fetch('http://localhost:3001/user/reset', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            password: confirmedpassword, 
            resetOtp: otp // Make sure `otp` is the variable holding the user's OTP input
          }),
        });
  
        if (res.status === 200) {
          dispatch(
            openSnackbar({
              message: "Password Reset Successfully",
              severity: "success",
            })
          );
          setShowForgotPassword(false);
          setEmail("");
          setNewpassword("");
          setConfirmedpassword("");
          setOtpVerified(false);
          setResettingPassword(false);
        } else if (res.status === 400) {
          dispatch(
            openSnackbar({
              message: "OTP verification failed or invalid request.",
              severity: "error",
            })
          );
          setShowOTP(true); // Show OTP input again for the user to retry
          setOtpVerified(false);
          setResettingPassword(false);
        }
      } catch (err) {
        dispatch(
          openSnackbar({
            message: err.message,
            severity: "error",
          })
        );
        setShowOTP(false);
        setOtpVerified(false);
        setResettingPassword(false);
      }
    }
  }, [otpVerified, email, confirmedpassword, otp, dispatch]);
  

  const closeForgetPassword = () => {
    setShowForgotPassword(false)
    setShowOTP(false)
  }

  useEffect(() => {
    if (otpVerified) {
      performResetPassword();
    }
  }, [otpVerified, performResetPassword]);
  

  return !isLoggedIn ? (
    <Modal open={true} onClose={() => setSignInOpen(false)}>
      <div className="w-full h-full absolute top-0 left-0 bg-black/70 flex items-center justify-center">
        {!showForgotPassword ? (
          <div className="w-[360px] rounded-[30px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-3 flex flex-col relative">
            <CloseRounded
              className="absolute top-6 right-8 cursor-pointer"
              onClick={() => setSignInOpen(false)}
            />
            {needsOTPVerification && showOTP ? (
              <OTP 
                email={email} 
                name="User" 
                otpVerified={otpVerified} 
                setOtpVerified={setOtpVerified} 
                reason="LOGIN" 
              />
            ) : (
              <>
                <div className="text-[22px] font-medium mx-7 my-4 text text-center">Sign In</div>
                <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 mt-6 flex items-center px-4">
                  <EmailRounded className="text-xl mr-3" />
                  <input
                    className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                    placeholder="Email Id"
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {emailError && <div className="text-red-500 text-xs mx-7 my-0.5">{emailError}</div>}
                <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 flex items-center px-4">
                  <PasswordRounded className="text-xl mr-3" />
                  <input
                    className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                    placeholder="Password"
                    type={values.showPassword ? "text" : "password"}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <IconButton
                    color="inherit"
                    onClick={() => setValues({ ...values, showPassword: !values.showPassword })}
                  >
                    {values.showPassword ? (
                      <Visibility className="text-xl" />
                    ) : (
                      <VisibilityOff className="text-xl" />
                    )}
                  </IconButton>
                </div>
                <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 mt-3 flex items-center px-4">
                  <input
                    type="checkbox"
                    id="admin"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    className="mr-3"
                  />
                  <label htmlFor="admin">Admin</label>
                </div>
                {credentialError && <div className="text-red-500 text-xs mx-7 my-0.5">{credentialError}</div>}
                {userBlocked && <div className="text-red-500 text-xs mx-7 my-0.5">{credentialError}</div>}
                <div 
                  className="text-gray-500 dark:text-gray-400 text-sm mx-7 my-2 text-right cursor-pointer hover:text-blue-500 dark:hover:text-blue-400"
                  onClick={() => setShowForgotPassword(true)}
                >
                  <b>Forgot password ?</b>
                </div>
                <div
                  className={`h-11 rounded-xl mx-5 mt-1.5 flex items-center justify-center text-sm font-medium cursor-pointer
                    ${disabled ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : 'bg-blue-500 text-white'}`}
                  onClick={handleLogin}
                >
                  {Loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : (
                    "Sign In"
                  )}
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mx-5 my-5 flex justify-center items-center">
                  Don't have an account ?
                  <span
                    className="text-blue-500 dark:text-blue-400 ml-1.5 cursor-pointer"
                    onClick={() => {
                      setSignUpOpen(true);
                      setSignInOpen(false);
                    }}
                  >
                    Create Account
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-[360px] rounded-[30px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-3 flex flex-col relative">
            <CloseRounded
              className="absolute top-6 right-8 cursor-pointer"
              onClick={closeForgetPassword}
            />
            {!showOTP ? (
              <>
                <div className="text-[22px] font-medium mx-7 my-4">Reset Password</div>
                  {resettingPassword ? (
                    <div className="px-7 pb-5 text-center flex flex-col items-center gap-3.5 justify-center">
                      Updating password
                      <CircularProgress color="inherit" size={20} />
                    </div>
                  ) : (
                    <>
                      {/* Display Email and OTP fields if OTP is not verified */}
                      {!otpVerified ? (
                        <>
                          {/* Email Input Field */}
                          <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 mt-6 flex items-center px-4">
                            <EmailRounded className="text-xl mr-3" />
                            <input
                              className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                              placeholder="Email Id"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                          {emailError && <div className="text-red-500 text-xs mx-7 my-0.5">{emailError}</div>}

                          {/* Get OTP Button */}
                          {!showOTP && (
                            <div
                              className={`h-11 rounded-xl mx-5 mt-1.5 mb-6 flex items-center justify-center text-sm font-medium cursor-pointer
                                          ${resetDisabled ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : 'bg-blue-500 text-white'}`}
                              onClick={sendOtp}
                            >
                              {Loading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : (
                                "Get OTP"
                              )}
                            </div>
                          )}
                          {/* OTP Input Field */}
                          {showOTP && (
                            <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 flex items-center px-4">
                              <input
                                className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                                placeholder="Enter OTP"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Verify OTP Button */}
                          {showOTP && (
                            <div
                              className={`h-11 rounded-xl mx-5 mt-1.5 mb-6 flex items-center justify-center text-sm font-medium cursor-pointer
                                          ${resetDisabled ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : 'bg-blue-500 text-white'}`}
                              onClick={() => setOtpVerified(true)} // Replace with actual OTP verification logic if needed
                            >
                              {Loading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : (
                                "Verify OTP"
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* New Password Fields after OTP verification */}
                          <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 mt-6 flex items-center px-4">
                            <EmailRounded className="text-xl mr-3" />
                            <input
                              className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                              placeholder="Email Id"
                              type="email"
                              value={email}
                              disabled
                            />
                          </div>
                          <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 flex items-center px-4">
                            <PasswordRounded className="text-xl mr-3" />
                            <input
                              className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                              placeholder="New Password"
                              type={values.showPassword ? "text" : "password"}
                              value={newpassword}
                              onChange={(e) => setNewpassword(e.target.value)}
                            />
                          </div>
                          <div className="h-11 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mx-5 my-1 flex items-center px-4">
                            <PasswordRounded className="text-xl mr-3" />
                            <input
                              className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
                              placeholder="Confirm Password"
                              type={values.showPassword ? "text" : "password"}
                              value={confirmedpassword}
                              onChange={(e) => setConfirmedpassword(e.target.value)}
                            />
                            <IconButton
                              color="inherit"
                              onClick={() => setValues({ ...values, showPassword: !values.showPassword })}
                            >
                              {values.showPassword ? (
                                <Visibility className="text-xl" />
                              ) : (
                                <VisibilityOff className="text-xl" />
                              )}
                            </IconButton>
                          </div>
                          {samepassword && <div className="text-red-500 text-xs mx-7 my-0.5">{samepassword}</div>}

                          {/* Submit Button for Password Reset */}
                          <div
                            className={`h-11 rounded-xl mx-5 mt-1.5 mb-6 flex items-center justify-center text-sm font-medium cursor-pointer
                                      ${resetDisabled ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : 'bg-blue-500 text-white'}`}
                            onClick={performResetPassword}
                          >
                            {Loading ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : (
                              "Reset Password"
                            )}
                          </div>
                        </>
                      )}

                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mx-5 my-5 flex justify-center items-center">
                        Don't have an account?
                        <span
                          className="text-blue-500 dark:text-blue-400 ml-1.5 cursor-pointer"
                          onClick={() => {
                            setSignUpOpen(true);
                            setSignInOpen(false);
                          }}
                        >
                          Create Account
                        </span>
                      </div>
                  </>
                )}
              </>
            ) : (
              <OTP 
                email={email} 
                name="User" 
                otpVerified={otpVerified} 
                setOtpVerified={setOtpVerified} 
                reason="FORGOTPASSWORD" 
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  ) : null;
};

export default SignIn;