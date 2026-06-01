import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import {
  queryRun,
  queryGet,
  queryAll,
  initDatabase
} from './db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'room_expense_tracker_secret_2026';

// Middleware to authenticate JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to restrict to admin only
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
};

// Helper for audit logging
async function logAction(memberId, action, details) {
  try {
    await queryRun(
      'INSERT INTO audit_logs (member_id, action, details) VALUES (?, ?, ?)',
      [memberId, action, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ---------------- AUTH ROUTES ----------------

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const user = await queryGet('SELECT * FROM members WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive. Contact Admin.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAction(user.id, 'Login', `User ${user.username} logged in successfully`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        mobile: user.mobile
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ---------------- MEMBER ROUTES ----------------

// Get all members
router.get('/members', authenticateToken, async (req, res) => {
  try {
    // Admins see all, standard members only see active members
    let sql = 'SELECT id, name, mobile, username, role, status, created_at FROM members';
    let params = [];
    
    if (req.user.role !== 'admin') {
      sql += ' WHERE status = ?';
      params.push('active');
    }
    
    const members = await queryAll(sql, params);
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Create member (Admin only)
router.post('/members', authenticateToken, requireAdmin, async (req, res) => {
  const { name, mobile, username, password, role } = req.body;
  if (!name || !mobile || !username || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await queryGet('SELECT id FROM members WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await queryRun(
      'INSERT INTO members (name, mobile, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, mobile, username, hashedPassword, role || 'member', 'active']
    );

    await logAction(req.user.id, 'Create Member', `Created member ${username} (ID: ${result.id})`);
    res.status(201).json({ id: result.id, message: 'Member created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Update member (Admin can update anything, self can update profile fields like password/mobile)
router.put('/members/:id', authenticateToken, async (req, res) => {
  const memberId = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === memberId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: 'Unauthorized profile update' });
  }

  const { name, mobile, username, password, role, status } = req.body;

  try {
    const existing = await queryGet('SELECT * FROM members WHERE id = ?', [memberId]);
    if (!existing) {
      return res.status(404).json({ message: 'Member not found' });
    }

    let updateSql = 'UPDATE members SET name = ?, mobile = ?';
    let params = [name || existing.name, mobile || existing.mobile];

    if (password) {
      const hashed = bcrypt.hashSync(password, 10);
      updateSql += ', password = ?';
      params.push(hashed);
    }

    if (isAdmin) {
      updateSql += ', role = ?, status = ?';
      params.push(role || existing.role, status || existing.status);
      
      if (username && username !== existing.username) {
        // Ensure username is unique
        const userCheck = await queryGet('SELECT id FROM members WHERE username = ?', [username]);
        if (userCheck) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        updateSql += ', username = ?';
        params.push(username);
      }
    }

    updateSql += ' WHERE id = ?';
    params.push(memberId);

    await queryRun(updateSql, params);
    await logAction(req.user.id, 'Update Member', `Updated details for member ID ${memberId}`);

    res.json({ message: 'Member updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Reset password (Admin only)
router.post('/members/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  const memberId = parseInt(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password required' });
  }

  try {
    const member = await queryGet('SELECT username FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    await queryRun('UPDATE members SET password = ? WHERE id = ?', [hashed, memberId]);
    await logAction(req.user.id, 'Reset Password', `Reset password for member ${member.username}`);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ---------------- SETTLEMENT LOGIC HELPERS ----------------

export async function calculateSettlementsInternal() {
  const members = await queryAll("SELECT id, name, mobile, username, role, status FROM members WHERE status = 'active'");
  
  const contributions = await queryAll(`
    SELECT c.*, m.name as member_name 
    FROM contributions c 
    JOIN members m ON c.member_id = m.id 
    WHERE c.closed_month IS NULL
  `);
  
  const expenses = await queryAll(`
    SELECT e.*, m.name as member_name 
    FROM expenses e 
    JOIN members m ON e.paid_by_member_id = m.id 
    WHERE e.closed_month IS NULL
  `);
  
  const memberConts = {};
  members.forEach(m => {
    memberConts[m.id] = {
      id: m.id,
      name: m.name,
      contributed: 0,
      share: 0,
      difference: 0
    };
  });
  
  let totalContributions = 0;
  contributions.forEach(c => {
    if (memberConts[c.member_id]) {
      memberConts[c.member_id].contributed += c.amount;
    }
    totalContributions += c.amount;
  });
  
  let totalExpenses = 0;
  expenses.forEach(e => {
    totalExpenses += e.amount;
  });
  
  const walletBalance = totalContributions - totalExpenses;
  
  const activeCount = members.length;
  const share = activeCount > 0 ? totalExpenses / activeCount : 0;
  
  members.forEach(m => {
    const mc = memberConts[m.id];
    mc.share = share;
    mc.difference = mc.contributed - share;
  });
  
  const creditors = [];
  const debtors = [];
  
  Object.values(memberConts).forEach(mc => {
    mc.difference = Math.round(mc.difference * 100) / 100;
    mc.contributed = Math.round(mc.contributed * 100) / 100;
    mc.share = Math.round(mc.share * 100) / 100;
    
    if (mc.difference > 0.01) {
      creditors.push({ ...mc });
    } else if (mc.difference < -0.01) {
      debtors.push({ ...mc, absDiff: Math.abs(mc.difference) });
    }
  });
  
  creditors.sort((a, b) => b.difference - a.difference);
  debtors.sort((a, b) => b.absDiff - a.absDiff);
  
  const payments = [];
  let cIdx = 0;
  let dIdx = 0;
  
  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];
    
    const paymentAmount = Math.min(creditor.difference, debtor.absDiff);
    if (paymentAmount > 0.01) {
      payments.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: Math.round(paymentAmount * 100) / 100
      });
    }
    
    creditor.difference -= paymentAmount;
    debtor.absDiff -= paymentAmount;
    
    if (creditor.difference < 0.01) {
      cIdx++;
    }
    if (debtor.absDiff < 0.01) {
      dIdx++;
    }
  }
  
  // Calculate today's/this month's expenses
  const todayStr = new Date().toISOString().split('T')[0]; // local or server time YYYY-MM-DD
  const curMonthStr = todayStr.substring(0, 7); // YYYY-MM
  
  let todayExpenses = 0;
  let thisMonthExpenses = 0;
  
  expenses.forEach(e => {
    if (e.date === todayStr) {
      todayExpenses += e.amount;
    }
    if (e.date.startsWith(curMonthStr)) {
      thisMonthExpenses += e.amount;
    }
  });
  
  return {
    members: Object.values(memberConts),
    payments,
    totalContributions,
    totalExpenses,
    walletBalance,
    todayExpenses,
    thisMonthExpenses,
    transactionCount: contributions.length + expenses.length
  };
}

// Get dashboard summary stats & settlements
router.get('/settlements', authenticateToken, async (req, res) => {
  try {
    const report = await calculateSettlementsInternal();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Calculation error', error: err.message });
  }
});

// ---------------- TRANSACTION HISTORY ROUTE (ALL-IN-ONE LISTING) ----------------

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    // We combine contributions and expenses into a single unified stream
    const contributions = await queryAll(`
      SELECT c.id, c.date, 'contribution' as type, c.amount, m.name as member_name, c.member_id,
             '' as category, c.remarks as description, c.closed_month
      FROM contributions c
      JOIN members m ON c.member_id = m.id
    `);

    const expenses = await queryAll(`
      SELECT e.id, e.date, 'expense' as type, e.amount, m.name as member_name, e.paid_by_member_id as member_id,
             e.category, e.description, e.closed_month
      FROM expenses e
      JOIN members m ON e.paid_by_member_id = m.id
    `);

    // Combine and sort descending by date and then by id
    const allTransactions = [...contributions, ...expenses];
    allTransactions.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });

    res.json(allTransactions);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ---------------- CONTRIBUTION MODULE ROUTES ----------------

router.get('/contributions', authenticateToken, async (req, res) => {
  try {
    const list = await queryAll(`
      SELECT c.*, m.name as member_name 
      FROM contributions c 
      JOIN members m ON c.member_id = m.id
      ORDER BY c.date DESC, c.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/contributions', authenticateToken, async (req, res) => {
  const { date, member_id, amount, payment_method, remarks } = req.body;
  if (!date || !member_id || !amount || !payment_method) {
    return res.status(400).json({ message: 'Missing required contribution fields' });
  }

  try {
    // Verify member exists and is active
    const member = await queryGet('SELECT name FROM members WHERE id = ? AND status = ?', [member_id, 'active']);
    if (!member) {
      return res.status(400).json({ message: 'Invalid or inactive member ID' });
    }

    const result = await queryRun(
      'INSERT INTO contributions (date, member_id, amount, payment_method, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [date, member_id, amount, payment_method, remarks || '', req.user.id]
    );

    await logAction(
      req.user.id,
      'Add Contribution',
      `${member.name} added ₹${amount} via ${payment_method} on ${date}`
    );

    res.status(201).json({ id: result.id, message: 'Contribution added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Admin only edits/deletes
router.put('/contributions/:id', authenticateToken, requireAdmin, async (req, res) => {
  const contId = req.params.id;
  const { date, member_id, amount, payment_method, remarks } = req.body;

  try {
    const existing = await queryGet('SELECT * FROM contributions WHERE id = ?', [contId]);
    if (!existing) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    if (existing.closed_month) {
      return res.status(400).json({ message: 'Cannot edit contributions from a closed month' });
    }

    await queryRun(
      'UPDATE contributions SET date = ?, member_id = ?, amount = ?, payment_method = ?, remarks = ? WHERE id = ?',
      [date, member_id, amount, payment_method, remarks, contId]
    );

    await logAction(
      req.user.id,
      'Edit Contribution',
      `Edited contribution ID ${contId}. Amount: ₹${existing.amount} -> ₹${amount}`
    );

    res.json({ message: 'Contribution updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.delete('/contributions/:id', authenticateToken, requireAdmin, async (req, res) => {
  const contId = req.params.id;

  try {
    const existing = await queryGet('SELECT * FROM contributions WHERE id = ?', [contId]);
    if (!existing) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    if (existing.closed_month) {
      return res.status(400).json({ message: 'Cannot delete contributions from a closed month' });
    }

    await queryRun('DELETE FROM contributions WHERE id = ?', [contId]);
    await logAction(
      req.user.id,
      'Delete Contribution',
      `Deleted contribution ID ${contId} of amount ₹${existing.amount}`
    );

    res.json({ message: 'Contribution deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ---------------- EXPENSE MODULE ROUTES ----------------

router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const list = await queryAll(`
      SELECT e.*, m.name as member_name 
      FROM expenses e 
      JOIN members m ON e.paid_by_member_id = m.id
      ORDER BY e.date DESC, e.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/expenses', authenticateToken, async (req, res) => {
  const { date, category, amount, paid_by_member_id, description, receipt_base64 } = req.body;
  if (!date || !category || !amount || !paid_by_member_id) {
    return res.status(400).json({ message: 'Missing required expense fields' });
  }

  try {
    // Verify member exists and is active
    const member = await queryGet('SELECT name FROM members WHERE id = ? AND status = ?', [paid_by_member_id, 'active']);
    if (!member) {
      return res.status(400).json({ message: 'Invalid or inactive member ID' });
    }

    const result = await queryRun(
      'INSERT INTO expenses (date, category, amount, paid_by_member_id, description, receipt_base64, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, category, amount, paid_by_member_id, description || '', receipt_base64 || null, req.user.id]
    );

    await logAction(
      req.user.id,
      'Add Expense',
      `Expense added by ${member.name} for ${category} of ₹${amount} on ${date}`
    );

    res.status(201).json({ id: result.id, message: 'Expense added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Admin only edits/deletes
router.put('/expenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const expId = req.params.id;
  const { date, category, amount, paid_by_member_id, description, receipt_base64 } = req.body;

  try {
    const existing = await queryGet('SELECT * FROM expenses WHERE id = ?', [expId]);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (existing.closed_month) {
      return res.status(400).json({ message: 'Cannot edit expenses from a closed month' });
    }

    // Preserve receipt if new one isn't uploaded (null/undefined)
    let receiptToSave = receipt_base64;
    if (receipt_base64 === undefined) {
      receiptToSave = existing.receipt_base64;
    }

    await queryRun(
      'UPDATE expenses SET date = ?, category = ?, amount = ?, paid_by_member_id = ?, description = ?, receipt_base64 = ? WHERE id = ?',
      [date, category, amount, paid_by_member_id, description, receiptToSave, expId]
    );

    await logAction(
      req.user.id,
      'Edit Expense',
      `Edited expense ID ${expId}. Amount: ₹${existing.amount} -> ₹${amount}`
    );

    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.delete('/expenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const expId = req.params.id;

  try {
    const existing = await queryGet('SELECT * FROM expenses WHERE id = ?', [expId]);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (existing.closed_month) {
      return res.status(400).json({ message: 'Cannot delete expenses from a closed month' });
    }

    await queryRun('DELETE FROM expenses WHERE id = ?', [expId]);
    await logAction(
      req.user.id,
      'Delete Expense',
      `Deleted expense ID ${expId} of amount ₹${existing.amount}`
    );

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ---------------- REPORTS & CLOSING ----------------

// Get closed months history
router.get('/closings', authenticateToken, async (req, res) => {
  try {
    const closings = await queryAll('SELECT mc.*, m.name as closed_by_name FROM monthly_closings mc JOIN members m ON mc.closed_by = m.id ORDER BY mc.month_year DESC');
    res.json(closings);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Close monthly account (Admin only)
router.post('/reports/close', authenticateToken, requireAdmin, async (req, res) => {
  const { month_year } = req.body; // format 'YYYY-MM'
  if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
    return res.status(400).json({ message: 'Valid month_year format (YYYY-MM) is required' });
  }

  try {
    // Verify if already closed
    const alreadyClosed = await queryGet('SELECT id FROM monthly_closings WHERE month_year = ?', [month_year]);
    if (alreadyClosed) {
      return res.status(400).json({ message: `Month ${month_year} is already closed.` });
    }

    // Get current settlement statistics (this is the state we freeze)
    const reportState = await calculateSettlementsInternal();

    // Check if there are active transactions to freeze
    const activeConts = await queryAll('SELECT id FROM contributions WHERE closed_month IS NULL');
    const activeExps = await queryAll('SELECT id FROM expenses WHERE closed_month IS NULL');
    
    if (activeConts.length === 0 && activeExps.length === 0) {
      return res.status(400).json({ message: 'No active transactions to close for this month.' });
    }

    // Write to monthly closings
    await queryRun(
      'INSERT INTO monthly_closings (month_year, closed_by, total_contributions, total_expenses, wallet_balance, settlement_data) VALUES (?, ?, ?, ?, ?, ?)',
      [
        month_year,
        req.user.id,
        reportState.totalContributions,
        reportState.totalExpenses,
        reportState.walletBalance,
        JSON.stringify(reportState)
      ]
    );

    // Update active transactions to mark them as closed under this month
    await queryRun('UPDATE contributions SET closed_month = ? WHERE closed_month IS NULL', [month_year]);
    await queryRun('UPDATE expenses SET closed_month = ? WHERE closed_month IS NULL', [month_year]);

    await logAction(
      req.user.id,
      'Close Month',
      `Closed monthly accounts for ${month_year}. Contributions: ₹${reportState.totalContributions}, Expenses: ₹${reportState.totalExpenses}`
    );

    res.json({ message: `Monthly account for ${month_year} closed successfully!` });
  } catch (err) {
    res.status(500).json({ message: 'Error closing month', error: err.message });
  }
});

// Excel Export Router
router.get('/reports/export/excel', authenticateToken, async (req, res) => {
  try {
    const reportState = await calculateSettlementsInternal();
    
    // Create Excel Workbook
    const wb = xlsx.utils.book_new();

    // Sheet 1: Summary Stats
    const summaryData = [
      { Metric: 'Current Wallet Balance', Value: reportState.walletBalance },
      { Metric: 'Total Contributions', Value: reportState.totalContributions },
      { Metric: 'Total Expenses', Value: reportState.totalExpenses },
      { Metric: 'Number of Transactions', Value: reportState.transactionCount },
      { Metric: 'Today\'s Expenses', Value: reportState.todayExpenses },
      { Metric: 'This Month\'s Expenses', Value: reportState.thisMonthExpenses }
    ];
    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary Dashboard');

    // Sheet 2: Member Settlement Table
    const memberData = reportState.members.map(m => ({
      'Member Name': m.name,
      'Contributed (INR)': m.contributed,
      'Share (INR)': m.share,
      'Difference (INR)': m.difference,
      'Status': m.difference >= 0 ? 'To Receive' : 'To Pay'
    }));
    const wsMembers = xlsx.utils.json_to_sheet(memberData);
    xlsx.utils.book_append_sheet(wb, wsMembers, 'Member Settlements');

    // Sheet 3: Settlement Actions (Who pays whom)
    const paymentData = reportState.payments.map(p => ({
      'From Member': p.fromName,
      'To Member': p.toName,
      'Amount (INR)': p.amount
    }));
    const wsPayments = xlsx.utils.json_to_sheet(paymentData);
    xlsx.utils.book_append_sheet(wb, wsPayments, 'Settlement Actions');

    // Fetch detailed transaction logs (active only)
    const activeConts = await queryAll(`
      SELECT c.date, m.name as member_name, c.amount, c.payment_method, c.remarks 
      FROM contributions c 
      JOIN members m ON c.member_id = m.id 
      WHERE c.closed_month IS NULL
      ORDER BY c.date DESC
    `);
    const wsContsDetail = xlsx.utils.json_to_sheet(activeConts);
    xlsx.utils.book_append_sheet(wb, wsContsDetail, 'Contributions Detail');

    const activeExps = await queryAll(`
      SELECT e.date, e.category, e.amount, m.name as paid_by, e.description 
      FROM expenses e 
      JOIN members m ON e.paid_by_member_id = m.id 
      WHERE e.closed_month IS NULL
      ORDER BY e.date DESC
    `);
    const wsExpsDetail = xlsx.utils.json_to_sheet(activeExps);
    xlsx.utils.book_append_sheet(wb, wsExpsDetail, 'Expenses Detail');

    // Buffer output
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=room-expense-report.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Excel generation error', error: err.message });
  }
});

// PDF Export Router
router.get('/reports/export/pdf', authenticateToken, async (req, res) => {
  try {
    const reportState = await calculateSettlementsInternal();

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=room-expense-report.pdf');
    doc.pipe(res);

    // --- PDF Design & Typography ---
    doc.fillColor('#1e293b').fontSize(22).text('Room Expense Tracker', { align: 'center' });
    doc.fontSize(12).fillColor('#64748b').text('Monthly Settlement & Transaction Summary Report', { align: 'center' });
    doc.moveDown(1.5);

    // Date
    doc.fillColor('#1e293b').fontSize(10).text(`Generated Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Wallet Summary Section (Card style)
    doc.rect(50, 120, 500, 70).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(12).text('Wallet Quick Summary', 65, 130);
    
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Total Contributions: Rs. ${reportState.totalContributions.toFixed(2)}`, 65, 155);
    doc.text(`Total Room Expenses: Rs. ${reportState.totalExpenses.toFixed(2)}`, 230, 155);
    
    // Wallet color logic
    const valColor = reportState.walletBalance >= 0 ? '#10b981' : '#ef4444';
    doc.fillColor(valColor).text(`Available Balance: Rs. ${reportState.walletBalance.toFixed(2)}`, 395, 155);
    doc.moveDown(3);

    // Settlements Header
    doc.fillColor('#1e293b').fontSize(14).text('Room Members Balance Difference', 50, 210);
    doc.moveDown();

    // Table Header
    let y = 230;
    doc.fillColor('#475569').fontSize(10);
    doc.text('Member Name', 60, y);
    doc.text('Contributed', 200, y);
    doc.text('Share', 320, y);
    doc.text('Net Balance (Owed/Due)', 420, y);
    
    // Line separator
    doc.strokeColor('#cbd5e1').moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    
    // Table rows
    y += 25;
    doc.fillColor('#1e293b');
    reportState.members.forEach(m => {
      doc.text(m.name, 60, y);
      doc.text(`Rs. ${m.contributed.toFixed(2)}`, 200, y);
      doc.text(`Rs. ${m.share.toFixed(2)}`, 320, y);
      
      const diffColor = m.difference >= 0 ? '#10b981' : '#ef4444';
      const sign = m.difference >= 0 ? '+' : '';
      doc.fillColor(diffColor).text(`${sign}Rs. ${m.difference.toFixed(2)}`, 420, y);
      doc.fillColor('#1e293b');
      y += 20;
    });

    doc.moveDown(2);
    y = doc.y + 10;

    // Actionable Settlements List
    doc.fillColor('#1e293b').fontSize(14).text('Settlement Action Items (Who pays whom)', 50, y);
    doc.moveDown();
    
    y = doc.y;
    if (reportState.payments.length === 0) {
      doc.fontSize(10).fillColor('#64748b').text('All balances are perfectly clear. No settlements needed!', 60, y);
      doc.moveDown();
    } else {
      reportState.payments.forEach(p => {
        doc.fontSize(10).fillColor('#ef4444').text(`${p.fromName}`, 60, y);
        doc.fillColor('#475569').text(' needs to pay ', 110, y);
        doc.fillColor('#10b981').text(`${p.toName}`, 190, y);
        doc.fillColor('#0f172a').text(` Rs. ${p.amount.toFixed(2)}`, 260, y);
        y += 18;
      });
    }

    doc.moveDown(2);
    
    // Footer notice
    doc.fontSize(8).fillColor('#94a3b8').text('This is an auto-generated report by Room Expense Tracker system.', { align: 'center', valign: 'bottom' });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'PDF generation error', error: err.message });
  }
});

// ---------------- BACKUP & RESTORE ROUTER (ADMIN ONLY) ----------------

// Backup Database endpoint
router.get('/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const members = await queryAll('SELECT * FROM members');
    const contributions = await queryAll('SELECT * FROM contributions');
    const expenses = await queryAll('SELECT * FROM expenses');
    const audit_logs = await queryAll('SELECT * FROM audit_logs');
    const monthly_closings = await queryAll('SELECT * FROM monthly_closings');

    const backupPayload = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        members,
        contributions,
        expenses,
        audit_logs,
        monthly_closings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=room-tracker-backup.json');
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err) {
    res.status(500).json({ message: 'Database backup failed', error: err.message });
  }
});

// Restore Database endpoint
router.post('/restore', authenticateToken, requireAdmin, async (req, res) => {
  const { data } = req.body;
  if (!data || !data.members || !data.contributions || !data.expenses) {
    return res.status(400).json({ message: 'Invalid backup data format' });
  }

  try {
    // Wipe current database
    await queryRun('DELETE FROM members');
    await queryRun('DELETE FROM contributions');
    await queryRun('DELETE FROM expenses');
    await queryRun('DELETE FROM audit_logs');
    await queryRun('DELETE FROM monthly_closings');

    // Restore members
    for (const m of data.members) {
      await queryRun(
        'INSERT INTO members (id, name, mobile, username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.name, m.mobile, m.username, m.password, m.role, m.status, m.created_at]
      );
    }

    // Restore contributions
    for (const c of data.contributions) {
      await queryRun(
        'INSERT INTO contributions (id, date, member_id, amount, payment_method, remarks, closed_month, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.date, c.member_id, c.amount, c.payment_method, c.remarks, c.closed_month, c.created_by, c.created_at]
      );
    }

    // Restore expenses
    for (const e of data.expenses) {
      await queryRun(
        'INSERT INTO expenses (id, date, category, amount, paid_by_member_id, description, receipt_base64, closed_month, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [e.id, e.date, e.category, e.amount, e.paid_by_member_id, e.description, e.receipt_base64, e.closed_month, e.created_by, e.created_at]
      );
    }

    // Restore audit logs if they exist in backup
    if (data.audit_logs) {
      for (const log of data.audit_logs) {
        await queryRun(
          'INSERT INTO audit_logs (id, timestamp, member_id, action, details) VALUES (?, ?, ?, ?, ?)',
          [log.id, log.timestamp, log.member_id, log.action, log.details]
        );
      }
    }

    // Restore monthly closings if they exist in backup
    if (data.monthly_closings) {
      for (const mc of data.monthly_closings) {
        await queryRun(
          'INSERT INTO monthly_closings (id, month_year, closed_at, closed_by, total_contributions, total_expenses, wallet_balance, settlement_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [mc.id, mc.month_year, mc.closed_at, mc.closed_by, mc.total_contributions, mc.total_expenses, mc.wallet_balance, mc.settlement_data]
        );
      }
    }

    await logAction(req.user.id, 'Restore Database', 'Database restored successfully from user uploaded backup');

    res.json({ message: 'Database restored successfully!' });
  } catch (err) {
    // Re-initialize database back to safety if restore completely breaks
    await initDatabase();
    res.status(500).json({ message: 'Database restore failed, re-seeded default database.', error: err.message });
  }
});

// ---------------- AUDIT LOGS ROUTER (ADMIN ONLY) ----------------

router.get('/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await queryAll(`
      SELECT al.*, m.name as member_name, m.username
      FROM audit_logs al
      LEFT JOIN members m ON al.member_id = m.id
      ORDER BY al.timestamp DESC, al.id DESC
      LIMIT 500
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

export default router;
