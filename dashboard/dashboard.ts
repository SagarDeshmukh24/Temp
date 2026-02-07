import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

interface Transaction {
  id: number;
  transaction_id: string;
  description: string;
  credit_amt: number;
  debit_amt: number;
  type: string;
  amount: number;
  deposite_type: string;
  expense_type: string;
  time: string;
}

interface Stats {
  total: number;
  deposit: number;
  expense: number;
}

interface ExpenseBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: string;
  change: {
    value: number;
    direction: string;
  };
}

interface NewTransaction {
  description: string;
  transactionType: string;
  amount: string;
  deposite_type: string;
  expense_type: string;
}

interface Alert {
  show: boolean;
  message: string;
  type: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  // Configuration
  private readonly API_BASE_URL = 'http://127.0.0.1:8000';

  // User data
  userName: string = 'User';
  customerId: number | null = null;
  loading: boolean = false;
  showAddForm: boolean = false;

  // Alert system
  alert: Alert = { show: false, message: '', type: '' };

  // Stats
  stats: Stats = {
    total: 0,
    deposit: 0,
    expense: 0
  };

  // Transactions
  transactions: Transaction[] = [];
  
  // Expense breakdown
  expenseBreakdown: ExpenseBreakdown[] = [];

  // New transaction form
  newTransaction: NewTransaction = {
    description: '',
    transactionType: 'credit',
    amount: '',
    deposite_type: 'other',
    expense_type: 'other'
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  // Show alert function
  showAlert(message: string, type: string): void {
    this.alert = {
      show: true,
      message: message,
      type: type
    };

    setTimeout(() => {
      this.alert.show = false;
    }, 3000);
  }

  // Load user data from localStorage
  loadUserData(): void {
    const customerData = localStorage.getItem('customer');
    const token = localStorage.getItem('access');

    if (!customerData) {
      console.log('No customer data found, redirecting to login...');
      this.router.navigate(['/']);
      return;
    }

    try {
      const customer = JSON.parse(customerData);
      this.userName = customer.name || 'User';
      this.customerId = customer.id;
      console.log('Logged in user:', customer.name, 'ID:', customer.id);

      // Load transactions after user data is loaded
      this.loadTransactions();
    } catch (e) {
      console.error('Error parsing customer data:', e);
      this.router.navigate(['/']);
    }
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Calculate progress percentage for goal ring
  getProgressPercentage(): number {
    if (this.stats.deposit === 0) return 0;
    const remaining = this.stats.total;
    const percentage = (remaining / this.stats.deposit) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  // Calculate stroke offset for SVG ring (283 is circumference of circle)
  getStrokeDashoffset(): number {
    const percentage = this.getProgressPercentage();
    return 283 - (283 * percentage / 100);
  }

  // Calculate expense breakdown from transactions
  calculateExpenseBreakdown(): void {
    const breakdown: { [key: string]: any } = {};

    // Group expenses by type
    this.transactions.forEach((txn) => {
      if (txn.debit_amt > 0) {
        const category = txn.expense_type || 'other';
        if (!breakdown[category]) {
          breakdown[category] = {
            category: category,
            amount: 0,
            count: 0
          };
        }
        breakdown[category].amount += parseFloat(txn.debit_amt.toString());
        breakdown[category].count += 1;
      }
    });

    // Convert to array and calculate percentages
    this.expenseBreakdown = Object.values(breakdown).map((item: any) => {
      const percentage = this.stats.expense > 0
        ? ((item.amount / this.stats.expense) * 100).toFixed(1)
        : '0';

      return {
        category: item.category,
        amount: item.amount,
        count: item.count,
        percentage: percentage,
        change: this.getRandomChange()
      };
    });

    // Sort by amount descending
    this.expenseBreakdown.sort((a, b) => b.amount - a.amount);

    console.log('Expense breakdown calculated:', this.expenseBreakdown);
  }

  // Helper function to get icon for category
  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'food': 'fa-utensils',
      'transport': 'fa-car',
      'shopping': 'fa-shopping-cart',
      'bills': 'fa-file-invoice',
      'entertainment': 'fa-film',
      'health': 'fa-heartbeat',
      'education': 'fa-graduation-cap',
      'other': 'fa-ellipsis-h'
    };
    return icons[category] || 'fa-ellipsis-h';
  }

  // Helper for random change
  private getRandomChange(): { value: number; direction: string } {
    const change = (Math.random() * 30 - 15).toFixed(0);
    return {
      value: Math.abs(parseFloat(change)),
      direction: parseFloat(change) > 0 ? 'increase' : 'decrease'
    };
  }

  // Generate unique transaction ID
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return 'TXN' + timestamp + random;
  }

  // Load all transactions from backend
  loadTransactions(): void {
    if (!this.customerId) {
      console.error('Customer ID not found');
      return;
    }

    this.loading = true;

    const requestUrl = `${this.API_BASE_URL}/transactions/${this.customerId}/`;
    console.log('Loading transactions for customer ID:', this.customerId);
    console.log('Request URL:', requestUrl);

    this.http.get<any[]>(requestUrl).subscribe({
      next: (response) => {
        console.log('Raw response from backend:', response);

        if (!Array.isArray(response)) {
          console.error('Response is not an array:', response);
          this.transactions = [];
          this.loading = false;
          this.showAlert('Invalid response format from server', 'error');
          return;
        }

        this.transactions = response.map((txn) => ({
          id: txn.id,
          transaction_id: txn.transaction_id,
          description: txn.description,
          credit_amt: txn.credit_amt,
          debit_amt: txn.debit_amt,
          type: txn.credit_amt > 0 ? 'Credit' : 'Debit',
          amount: txn.credit_amt > 0 ? txn.credit_amt : txn.debit_amt,
          deposite_type: txn.deposite_type,
          expense_type: txn.expense_type,
          time: this.formatDateTime(txn.date || txn.created_at)
        }));

        this.calculateStats();
        this.calculateExpenseBreakdown();
        this.loading = false;
        console.log('Transactions loaded successfully:', this.transactions.length);
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        this.loading = false;
        this.showAlert('Failed to load transactions. Check console for details.', 'error');
      }
    });
  }

  // Format datetime to readable format
  private formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // Calculate statistics from transactions
  calculateStats(): void {
    this.stats.total = 0;
    this.stats.deposit = 0;
    this.stats.expense = 0;

    this.transactions.forEach((transaction) => {
      const creditAmt = parseFloat(transaction.credit_amt.toString()) || 0;
      const debitAmt = parseFloat(transaction.debit_amt.toString()) || 0;

      this.stats.deposit += creditAmt;
      this.stats.expense += debitAmt;
    });

    this.stats.total = this.stats.deposit - this.stats.expense;

    console.log('Stats calculated:', {
      deposit: this.stats.deposit,
      expense: this.stats.expense,
      total: this.stats.total,
      transactionCount: this.transactions.length
    });
  }

  // Toggle add transaction form
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  // Reset form
  resetForm(): void {
    this.newTransaction = {
      description: '',
      transactionType: 'credit',
      amount: '',
      deposite_type: 'other',
      expense_type: 'other'
    };
  }

  // Add new transaction
  addTransaction(): void {
    // Validation
    if (!this.newTransaction.description || !this.newTransaction.amount) {
      this.showAlert('Please fill all required fields', 'error');
      return;
    }

    if (parseFloat(this.newTransaction.amount) <= 0) {
      this.showAlert('Amount must be greater than 0', 'error');
      return;
    }

    this.loading = true;

    // Prepare data according to backend model
    const transactionData = {
      transaction_id: this.generateTransactionId(),
      description: this.newTransaction.description,
      credit_amt: this.newTransaction.transactionType === 'credit' ? parseFloat(this.newTransaction.amount) : 0,
      debit_amt: this.newTransaction.transactionType === 'debit' ? parseFloat(this.newTransaction.amount) : 0,
      deposite_type: this.newTransaction.transactionType === 'credit' ? this.newTransaction.deposite_type : 'other',
      expense_type: this.newTransaction.transactionType === 'debit' ? this.newTransaction.expense_type : 'other',
      customer_id: this.customerId
    };

    console.log('Sending transaction data:', transactionData);

    this.http.post(`${this.API_BASE_URL}/transaction/`, transactionData).subscribe({
      next: (response) => {
        console.log('Transaction added:', response);

        // Reload transactions to get fresh data from backend
        this.loadTransactions();

        // Reset form and hide
        this.resetForm();
        this.showAddForm = false;
        this.loading = false;

        this.showAlert('Transaction added successfully!', 'success');
      },
      error: (error) => {
        console.error('Error adding transaction:', error);
        this.loading = false;

        if (error.error && error.error.error) {
          this.showAlert('Error: ' + JSON.stringify(error.error), 'error');
        } else {
          this.showAlert('Failed to add transaction. Please try again.', 'error');
        }
      }
    });
  }

  // Watch transaction type change
  onTransactionTypeChange(): void {
    if (this.newTransaction.transactionType === 'credit') {
      this.newTransaction.expense_type = 'other';
    } else {
      this.newTransaction.deposite_type = 'other';
    }
  }

  // Logout function
  customer_logout(): void {
    console.log("Logging out...");
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('customer');
    this.router.navigate(['/']);
  }

  // Get progress ring class
  getProgressRingClass(): string {
    const percentage = this.getProgressPercentage();
    if (percentage < 10) return 'expense-danger';
    if (percentage < 30) return 'expense-warning';
    return '';
  }
}
