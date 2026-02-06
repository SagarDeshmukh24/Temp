import { Component, OnInit, OnDestroy  } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  // Configuration - Update with your backend API URL
  private API_BASE_URL = 'http://127.0.0.1:8000/customer';

  // Form state
  currentForm: 'login' | 'register' | 'forgot' | 'otp' | 'resetPassword' = 'login';
  loading = false;
  alert = { show: false, message: '', type: '' };
  currentSlide = 0;

  // Password visibility toggles
  showLoginPassword = false;
  showRegPassword = false;
  showNewPassword = false;

  // Forms
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  forgotForm!: FormGroup;
  otpForm!: FormGroup;
  resetPasswordForm!: FormGroup;

  // Reset token storage
  resetToken = '';
  forgotEmail = '';

  // Intervals
  private slideInterval: any;
  private welcomeTimeout: any;
  private hideWelcomeTimeout: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if user is already logged in
    const token = localStorage.getItem('access');
    if (token) {
      // User already logged in, redirect to dashboard
      this.router.navigate(['/dashboard']);
      return;
    }

    // Initialize forms
    this.initializeForms();

    // Start slideshow
    this.startSlideshow();

    // Welcome screen transition
    this.showWelcomeScreen();
  }

  ngOnDestroy(): void {
    // Clean up intervals and timeouts
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.welcomeTimeout) {
      clearTimeout(this.welcomeTimeout);
    }
    if (this.hideWelcomeTimeout) {
      clearTimeout(this.hideWelcomeTimeout);
    }
  }

  /**
   * Initialize all forms
   */
  initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      type: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      telegram_chat_id: ['']
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    this.resetPasswordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  /**
   * Start slideshow auto-advance
   */
  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % 4;
    }, 4000);
  }

  /**
   * Set specific slide
   */
  setSlide(index: number): void {
    this.currentSlide = index;
  }

  /**
   * Show welcome screen with transition
   */
  showWelcomeScreen(): void {
    this.welcomeTimeout = setTimeout(() => {
      const welcomeScreen = document.getElementById('welcomeScreen');
      const authScreen = document.getElementById('authScreen');

      if (welcomeScreen && authScreen) {
        welcomeScreen.classList.add('hide');

        this.hideWelcomeTimeout = setTimeout(() => {
          welcomeScreen.style.display = 'none';
          authScreen.classList.add('show');
        }, 300);
      }
    }, 500);
  }

  /**
   * Switch between forms
   */
  switchForm(formName: 'login' | 'register' | 'forgot' | 'otp' | 'resetPassword'): void {
    this.currentForm = formName;
    this.alert.show = false;
  }

  /**
   * Show alert message
   */
  showAlert(message: string, type: 'success' | 'error' | 'info'): void {
    this.alert = {
      show: true,
      message: message,
      type: type
    };

    setTimeout(() => {
      this.alert.show = false;
    }, 4000);
  }

  /**
   * LOGIN FUNCTION
   */
  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.showAlert('Please fill in all fields correctly', 'error');
      return;
    }

    this.loading = true;

    try {
      const response: any = await this.http.post(
        `${this.API_BASE_URL}/login/`,
        this.loginForm.value
      ).toPromise();

      console.log(response);

      if (response.access) {
        localStorage.setItem('access', response.access);
        localStorage.setItem('refresh', response.refresh);
        localStorage.setItem('customer', JSON.stringify(response.customer));

        this.showAlert('Login successful! Redirecting...', 'success');

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 100);
      } else {
        this.showAlert(response.message || 'Login failed. Please try again.', 'error');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.showAlert('Network error. Please check your connection.', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * REGISTER FUNCTION
   */
  async register(): Promise<void> {
    if (this.registerForm.invalid) {
      this.showAlert('Please fill in all fields correctly', 'error');
      return;
    }

    this.loading = true;

    try {
      const response: any = await this.http.post(
        `${this.API_BASE_URL}/`,
        this.registerForm.value
      ).toPromise();

      console.log('Registration response:', response);

      // Check different possible success indicators
      if (response.access || response.token || response.id || response.email || response.customer_id) {
        // Save whatever tokens/data backend sends
        if (response.access) {
          localStorage.setItem('access', response.access);
          localStorage.setItem('refresh', response.refresh);
        }
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        if (response.reset_token) {
          localStorage.setItem('reset_token', response.reset_token);
        }

        // Save user data
        localStorage.setItem('customer', JSON.stringify(response));

        this.showAlert('Registration successful! Redirecting...', 'success');

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else if (response.error) {
        this.showAlert(response.error, 'error');
      } else if (response.message) {
        this.showAlert(response.message, 'error');
      } else {
        this.showAlert('Registration failed. Please try again.', 'error');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.showAlert('Network error. Please check your connection.', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * STEP 1: FORGOT PASSWORD - SEND OTP TO TELEGRAM
   */
  async forgotPassword(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.showAlert('Please enter a valid email address', 'error');
      return;
    }

    this.loading = true;
    this.forgotEmail = this.forgotForm.value.email;

    try {
      const response: any = await this.http.post(
        `${this.API_BASE_URL}/forgot-password/`,
        { email: this.forgotEmail }
      ).toPromise();

      this.showAlert('OTP sent to your Telegram!', 'success');
      this.currentForm = 'otp';
    } catch (error: any) {
      console.error('Forgot password error:', error);
      this.showAlert('Failed to send OTP. Please try again.', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * STEP 2: VERIFY OTP - GET RESET TOKEN
   */
  async verifyOTPStep(): Promise<void> {
    if (this.otpForm.invalid || this.otpForm.value.otp.length !== 6) {
      this.showAlert('Please enter a valid 6-digit OTP', 'error');
      return;
    }

    this.loading = true;

    try {
      const response: any = await this.http.post(
        `${this.API_BASE_URL}/verify-otp/`,
        {
          email: this.forgotEmail,
          otp: this.otpForm.value.otp
        }
      ).toPromise();

      if (response.reset_token) {
        // Store the reset token
        this.resetToken = response.reset_token;
        this.showAlert('OTP verified! Now set your new password.', 'success');
        // Move to reset password form
        this.currentForm = 'resetPassword';
      } else {
        this.showAlert(response.message || 'Invalid OTP. Please try again.', 'error');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      this.showAlert('Invalid OTP or network error.', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * STEP 3: RESET PASSWORD WITH TOKEN
   */
  async resetPassword(): Promise<void> {
    if (this.resetPasswordForm.invalid) {
      this.showAlert('Please enter a valid password (min 3 characters)', 'error');
      return;
    }

    this.loading = true;

    try {
      const response: any = await this.http.post(
        `${this.API_BASE_URL}/reset-password/`,
        {
          email: this.forgotEmail,
          reset_token: this.resetToken,
          new_password: this.resetPasswordForm.value.new_password
        }
      ).toPromise();

      this.showAlert('Password reset successful! Please login with your new password.', 'success');

      // Clear all form data
      this.otpForm.reset();
      this.resetPasswordForm.reset();
      this.forgotForm.reset();
      this.resetToken = '';
      this.forgotEmail = '';

      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.currentForm = 'login';
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      this.showAlert('Failed to reset password. Please try again.', 'error');
    } finally {
      this.loading = false;
    }
  }
}