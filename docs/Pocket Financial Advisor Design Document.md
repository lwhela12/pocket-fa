

\---

\# 🎨 Pocket Financial Advisor App \- Detailed Design Document

\---

\#\# 1\. Design Principles  
\- \*\*Clarity:\*\* Intuitive navigation with minimalistic design and clear visual hierarchy.  
\- \*\*Flexibility:\*\* Supports both simple and detailed data input with smooth transitions.  
\- \*\*Accessibility:\*\* Fully responsive and compliant with WCAG 2.1 standards.  
\- \*\*Consistency:\*\* Uniform UI components, interactions, and visual language.  
\- \*\*Quality:\*\* Premium, professional look with sharp typography (Inter, 16px), subtle gradients, and micro-interactions (e.g., button ripples).  
\- \*\*Trust and Security:\*\* Reinforce trust through visual cues (e.g., secure badges, clear data handling explanations) and user control (e.g., immediate feedback, undo options).

\---

\#\# 2\. Authentication Screens  
\- \*\*Signup/Login:\*\*  
  \- Clean, centered forms with minimal distractions.  
  \- Fields: Email (validated format), password (12+ characters, strength indicator).  
  \- \*\*Multi-Factor Authentication (MFA):\*\*   
    \- Post-login, a modal with a 3-step wizard:  
      1\. Choose method (Authenticator App or SMS).  
      2\. Scan QR code (app) or enter phone number (SMS).  
      3\. Confirm with a 6-digit code.  
    \- Progress bar at the top of the modal.  
\- \*\*Password Recovery:\*\*  
  \- Simple email-based reset with a 15-minute expiring link.  
  \- After 3 failed attempts, a CAPTCHA is required.  
  \- Confirmation screen upon successful reset.

\---

\#\# 3\. User Profile Setup  
\- \*\*Age and Retirement Age:\*\*  
  \- \*\*Age:\*\* Numeric input (18-100).  
  \- \*\*Retirement Age:\*\* Dropdown (40-80, in 5-year increments), defaulting to user age \+ 25 years.  
\- \*\*Risk Tolerance:\*\*  
  \- Three labeled buttons:  
    \- \*\*Conservative:\*\* "Low risk, stable returns"  
    \- \*\*Moderate:\*\* "Balanced growth"  
    \- \*\*Aggressive:\*\* "High risk, high reward"  
  \- Hover over each button shows a one-line explanation (e.g., "Conservative: Focus on bonds and stable assets").

\---

\#\# 4\. Financial Data Entry Screens

\#\#\# 4.1. Assets Entry  
\- \*\*Toggle Modes:\*\* Segmented control for "Simple" and "Detailed" modes.  
  \- Switching to "Detailed" expands fields with a 300ms animation.  
\- \*\*Cash Assets:\*\*  
  \- \*\*Simple:\*\* Total cash assets (numeric input, ≥ 0).  
  \- \*\*Detailed:\*\*   
    \- Account type (Checking, Savings).  
    \- Account name (e.g., "Chase Savings").  
    \- Balance (numeric input, ≥ 0).  
    \- Interest rate (numeric input with 0.01% steppers, 0%-10%).  
\- \*\*Investment Assets:\*\*  
  \- \*\*Simple:\*\* Total investment assets (numeric input, ≥ 0).  
  \- \*\*Detailed:\*\*  
    \- Account type (Roth IRA, Traditional IRA, 401(k), Taxable).  
    \- Account name (e.g., "Fidelity 401(k)").  
    \- Balance (numeric input, ≥ 0).  
    \- Annual contribution (numeric input, ≤ IRS limits).  
    \- Expected growth rate (numeric input with 0.01% steppers, 0%-15%).  
    \- Asset class (dropdown: Stocks, Bonds, ETFs, Mutual Funds).

\#\#\# 4.2. Debts Entry  
\- \*\*Simple:\*\* Total debts (numeric input, ≥ 0).  
\- \*\*Detailed:\*\*  
  \- Debt type (dropdown: Credit Card, Mortgage, Student Loan, Auto Loan).  
  \- Lender name (text input).  
  \- Balance (numeric input, ≥ 0).  
  \- Interest rate (numeric input with 0.01% steppers, 0%-30%).  
  \- Monthly payment (numeric input, \> 0).  
  \- Term length (numeric input, in months).

\#\#\# 4.3. Insurance Entry  
\- \*\*Fields:\*\*  
  \- Life Insurance: Coverage amount (numeric input, ≥ 0).  
  \- Disability Insurance: Coverage amount (numeric input, ≥ 0).  
  \- Long-Term Care Insurance: Coverage amount (numeric input, ≥ 0).  
\- \*\*Employer-Provided Indicator:\*\* Checkbox per insurance type.

\#\#\# 4.4. Expenses  
\- \*\*Toggle Modes:\*\* Segmented control for "Total" and "Categorized."  
\- \*\*Total:\*\* Single numeric input for monthly expenses (≥ 0).  
\- \*\*Categorized:\*\*  
  \- Predefined categories: Housing, Utilities, Groceries, Dining, Transport, Healthcare, Entertainment, Misc.  
  \- Numeric input per category (≥ 0).  
  \- Option to add custom categories.

\---

## 5. Statement Analyzer
For current UI spec, flow, and API details of statement upload and review, see [docs/STATEMENT_ANALYZER.md](docs/STATEMENT_ANALYZER.md).

\---

\#\# 6\. Financial Assumptions Management  
\- \*\*Layout:\*\* Vertical list with inline numeric inputs for:  
  \- Inflation rate (0%-10%, default 3%).  
  \- Expected investment return (0%-15%, default 7%).  
  \- Savings rate (0%-100%, default 10%).  
\- \*\*Tooltips:\*\* Icon next to each field with a brief explanation (e.g., "Inflation reduces the real value of your savings over time.").  
\- \*\*Real-Time Updates:\*\*   
  \- "Recalculating..." banner flashes for 1 second.  
  \- Dashboard graphs update with a subtle fade-in effect.

\---

\#\# 7\. Financial Dashboard & Visualizations  
\- \*\*Net Worth Snapshot:\*\*  
  \- 48px bold text, centered at the top.  
  \- Color: Green (\#00CC00) if positive, red (\#FF3333) if negative.  
  \- Tooltip shows asset and debt breakdown.  
\- \*\*Asset Allocation:\*\*  
  \- Interactive pie chart with clickable slices.  
  \- Hover shows percentage and USD value per slice.  
\- \*\*Financial Projections:\*\*  
  \- Line graph with years on the X-axis and net worth on the Y-axis.  
  \- Hover reveals a tooltip with year, projected net worth, and key assumptions (e.g., 3% inflation).  
\- \*\*Progress Chart:\*\*  
  \- Bar graph showing current savings vs. required savings for retirement.  
  \- Dashed target line indicates necessary net worth at retirement.

\---

\#\# 8\. AI Chat Interface  
\- \*\*Chat Button:\*\* Floating, pulsing icon (blue, \#2196F3, 56px) in the bottom-right corner on first login.  
\- \*\*Chat UI:\*\*  
  \- User messages: Blue (\#2196F3), right-aligned.  
  \- AI responses: Gray (\#E0E0E0), left-aligned.  
  \- 16px sans-serif font, bubbles with 8px radius.  
\- \*\*Quick-Start Prompts:\*\* Three example questions above the input (e.g., "Am I on track for retirement?").  
\- \*\*Error Handling:\*\* Red text (\#D32F2F) above the input with a "Retry" button for missing data.

\---

\#\# 9\. Educational Resources Section  
\- \*\*Glossary:\*\* "?" icon next to financial terms, opening a popover with a 50-word definition and a "Learn More" link.  
\- \*\*Video Tutorials:\*\* Embedded 1-2 minute videos (e.g., "What’s Compound Interest?") with captions, hosted in-app.

\---

\#\# 10\. Technical and Compliance Considerations  
\- \*\*Responsiveness:\*\*  
  \- \*\*Mobile (\<768px):\*\* Stacked layout.  
  \- \*\*Tablet (768-1024px):\*\* 2-column layout.  
  \- \*\*Desktop (\>1024px):\*\* Grid-based layout.  
\- \*\*Testing Suite:\*\*  
  \- Jest for unit tests.  
  \- Cypress for end-to-end tests.  
  \- Lighthouse for accessibility audits.  
\- \*\*Security:\*\*  
  \- AES-256 encryption for data at rest.  
  \- HTTPS with TLS 1.3 for data in transit.  
\- \*\*Compliance:\*\*  
  \- GDPR: Consent prompts, data retention (2 years inactivity), right to erasure/portability.  
  \- CCPA: Opt-out mechanisms for data sharing.

\---

\#\# 11\. Style Guide  
\- \*\*Colors:\*\*  
  \- Primary: \#2196F3 (blue)  
  \- Secondary: \#00CC00 (green)  
  \- Error: \#D32F2F (red)  
  \- Neutral: \#E0E0E0 (gray)  
\- \*\*Typography:\*\* Roboto, 16px base, 1.5 line height.  
\- \*\*Spacing:\*\* 8px grid system for margins and padding.  
\- \*\*Buttons:\*\* Rounded (4px), with ripple effect on click.  
\- \*\*Accessibility:\*\* Contrast ratios ≥ 4.5:1, keyboard navigation support, screen reader labels.

\---

\#\# 12\. Wireframes and Mockups  
\- \*\*Attached:\*\* High-fidelity mockups for:  
  \- Login/Registration  
  \- User Profile Setup  
  \- Financial Data Entry (Assets, Debts, Expenses)  
  \- Dashboard  
  \- AI Chat Interface  
\- \*\*Visual Flow:\*\* User journey from onboarding to dashboard with key interactions highlighted.

\---

s\!  
