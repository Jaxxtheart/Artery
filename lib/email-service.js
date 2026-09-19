/**
 * Email Service using Resend
 * Handles all transactional emails for Artery Capital
 */

let Resend;
try {
  Resend = require('resend').Resend;
} catch (e) {
  console.warn('⚠️  resend package not available. Email notifications will be disabled.');
}
const { applicantConfirmationEmail, adminNotificationEmail } = require('./email-templates');

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL || 'invest@arterycapital.co.za';
const fromEmail = process.env.FROM_EMAIL || 'Artery Capital <noreply@arterycapital.co.za>';

if (!resendApiKey) {
  console.warn('⚠️  Resend API key not configured. Email notifications will not be sent.');
}

const resend = (Resend && resendApiKey) ? new Resend(resendApiKey) : null;

/**
 * Send confirmation email to applicant
 * @param {Object} applicationData - Application form data
 * @returns {Promise<Object>} - Resend response
 */
async function sendApplicantConfirmation(applicationData) {
  if (!resend) {
    console.warn('Skipping applicant email - Resend not configured');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const htmlContent = applicantConfirmationEmail(applicationData);

    const result = await resend.emails.send({
      from: fromEmail,
      to: applicationData.email,
      subject: `Application Received - ${applicationData.companyName} | Artery Capital`,
      html: htmlContent
    });

    console.log(`✅ Confirmation email sent to ${applicationData.email}`);
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to send applicant confirmation:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

/**
 * Send notification email to admin team
 * @param {Object} applicationData - Application form data
 * @param {Object} scoring - AI scoring results
 * @returns {Promise<Object>} - Resend response
 */
async function sendAdminNotification(applicationData, scoring) {
  if (!resend) {
    console.warn('Skipping admin email - Resend not configured');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const htmlContent = adminNotificationEmail(applicationData, scoring);

    const result = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `🚀 New Application: ${applicationData.companyName} [Score: ${scoring.overallScore}]`,
      html: htmlContent,
      replyTo: applicationData.email
    });

    console.log(`✅ Admin notification sent to ${adminEmail}`);
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    throw new Error(`Admin notification failed: ${error.message}`);
  }
}

/**
 * Send both confirmation and notification emails
 * @param {Object} applicationData - Application form data
 * @param {Object} scoring - AI scoring results
 * @returns {Promise<Object>} - Results of both email sends
 */
async function sendApplicationEmails(applicationData, scoring) {
  if (!resend) {
    console.warn('⚠️  Email service not configured. No emails will be sent.');
    return {
      applicantEmail: { success: false, message: 'Email service not configured' },
      adminEmail: { success: false, message: 'Email service not configured' }
    };
  }

  const results = {
    applicantEmail: null,
    adminEmail: null,
    errors: []
  };

  // Send applicant confirmation (don't fail if this fails)
  try {
    results.applicantEmail = await sendApplicantConfirmation(applicationData);
  } catch (error) {
    console.error('Applicant email error:', error);
    results.errors.push(`Applicant email: ${error.message}`);
  }

  // Send admin notification (don't fail if this fails)
  try {
    results.adminEmail = await sendAdminNotification(applicationData, scoring);
  } catch (error) {
    console.error('Admin email error:', error);
    results.errors.push(`Admin email: ${error.message}`);
  }

  return results;
}

module.exports = {
  sendApplicantConfirmation,
  sendAdminNotification,
  sendApplicationEmails
};
