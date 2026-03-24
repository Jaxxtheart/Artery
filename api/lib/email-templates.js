/**
 * Email HTML Templates
 * Professional email templates for applicant confirmations and admin notifications
 */

/**
 * Applicant confirmation email
 * Sent immediately after successful application submission
 */
function applicantConfirmationEmail(data) {
  const { founderName, companyName, email } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - Artery Capital</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #FF5A5F;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 600; color: #2C2C2C;">
                Artery Capital
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: #666; letter-spacing: 1px;">
                AFRICA'S INNOVATION STARTS HERE
              </p>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 48px;">✓</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #2C2C2C; text-align: center;">
                Application Received!
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                Dear ${founderName},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                Thank you for applying to <strong>Artery Capital</strong> with <strong>${companyName}</strong>. We've successfully received your application and our team is excited to learn more about your vision.
              </p>

              <!-- Application Details Box -->
              <table role="presentation" style="width: 100%; background-color: #F9FAFB; border-radius: 6px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #6B7280;">
                      WHAT HAPPENS NEXT
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 15px; line-height: 1.8;">
                      <li>Our investment team will review your application within <strong>3-5 business days</strong></li>
                      <li>We evaluate all applications using our proprietary scoring algorithm</li>
                      <li>Selected founders will be invited to a <strong>discovery call</strong></li>
                      <li>Final candidates proceed to deep-dive due diligence</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                We're committed to supporting exceptional African founders. If your application is a strong fit, we'll reach out to <strong>${email}</strong> with next steps.
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                In the meantime, feel free to reply to this email if you have any questions or need to update your application.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px auto; text-align: center;">
                <tr>
                  <td style="background-color: #FF5A5F; border-radius: 6px; text-align: center;">
                    <a href="https://arterycapital.com" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Visit Our Website
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
                Best regards,<br>
                <strong>The Artery Capital Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6B7280; text-align: center;">
                <strong>Artery Capital</strong> • Africa's Innovation Starts Here
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                invest@arterycapital.co.za
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Admin notification email
 * Sent to admin team when new application is submitted
 */
function adminNotificationEmail(data, scoring) {
  const {
    founderName, email, phone, linkedin,
    companyName, country, industry, stage,
    problem, solution, fundingAmount
  } = data;

  const scoreColor = scoring.overallScore >= 75 ? '#10B981' :
                     scoring.overallScore >= 65 ? '#3B82F6' :
                     scoring.overallScore >= 50 ? '#F59E0B' : '#EF4444';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Application - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 30px; background: linear-gradient(135deg, #FF5A5F 0%, #E34850 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                🚀 New Application Received
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </td>
          </tr>

          <!-- AI Score Section -->
          <tr>
            <td style="padding: 30px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 50%; padding-right: 15px;">
                    <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      AI Score
                    </p>
                    <p style="margin: 0; font-size: 48px; font-weight: 700; color: ${scoreColor};">
                      ${scoring.overallScore}
                    </p>
                    <p style="margin: 5px 0 0; font-size: 14px; color: #6B7280;">
                      ${scoring.rating}
                    </p>
                  </td>
                  <td style="width: 50%; padding-left: 15px; border-left: 2px solid #E5E7EB;">
                    <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Recommendation
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                      ${scoring.recommendation}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Company Info -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #2C2C2C; border-bottom: 2px solid #FF5A5F; padding-bottom: 10px;">
                ${companyName}
              </h2>

              <table role="presentation" style="width: 100%; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Industry</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2C2C2C; font-weight: 600;">${industry}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Stage</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2C2C2C; font-weight: 600;">${stage}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Country</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2C2C2C; font-weight: 600;">${country}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Funding Ask</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2C2C2C; font-weight: 600;">${fundingAmount}</td>
                </tr>
              </table>

              <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #2C2C2C;">Problem</h3>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4B5563; background-color: #F9FAFB; padding: 15px; border-radius: 6px;">
                ${problem}
              </p>

              <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #2C2C2C;">Solution</h3>
              <p style="margin: 0 0 25px; font-size: 14px; line-height: 1.6; color: #4B5563; background-color: #F9FAFB; padding: 15px; border-radius: 6px;">
                ${solution}
              </p>

              <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #2C2C2C; border-top: 1px solid #E5E7EB; padding-top: 20px;">
                Founder Details
              </h3>

              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Name</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #2C2C2C; font-weight: 600;">${founderName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Email</td>
                  <td style="padding: 8px 0;">
                    <a href="mailto:${email}" style="font-size: 14px; color: #FF5A5F; text-decoration: none; font-weight: 600;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">Phone</td>
                  <td style="padding: 8px 0;">
                    <a href="tel:${phone}" style="font-size: 14px; color: #FF5A5F; text-decoration: none; font-weight: 600;">${phone}</a>
                  </td>
                </tr>
                ${linkedin ? `
                <tr>
                  <td style="padding: 8px 0; width: 30%; font-size: 14px; color: #6B7280; font-weight: 500;">LinkedIn</td>
                  <td style="padding: 8px 0;">
                    <a href="${linkedin}" style="font-size: 14px; color: #FF5A5F; text-decoration: none; font-weight: 600;">View Profile</a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Category Scores -->
          <tr>
            <td style="padding: 30px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
              <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #2C2C2C;">Evaluation Breakdown</h3>
              ${Object.entries(scoring.categoryScores).map(([category, score]) => {
                const categoryNames = {
                  founderQuality: 'Founder Quality',
                  traction: 'Traction & Metrics',
                  productMarketFit: 'Product-Market Fit',
                  marketOpportunity: 'Market Opportunity',
                  innovation: 'Innovation',
                  africanImpact: 'African Impact',
                  sustainability: 'Sustainability'
                };
                const barColor = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
                return `
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-size: 13px; color: #4B5563; font-weight: 500;">${categoryNames[category]}</span>
                    <span style="font-size: 13px; color: #6B7280; font-weight: 600;">${score}/100</span>
                  </div>
                  <div style="width: 100%; height: 8px; background-color: #E5E7EB; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${score}%; height: 100%; background-color: ${barColor};"></div>
                  </div>
                </div>
                `;
              }).join('')}
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <a href="mailto:${email}" style="display: inline-block; margin: 0 10px; padding: 12px 24px; background-color: #FF5A5F; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                Contact Founder
              </a>
              <a href="https://arterycapital.com/admin" style="display: inline-block; margin: 0 10px; padding: 12px 24px; background-color: #2C2C2C; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View in Dashboard
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

module.exports = {
  applicantConfirmationEmail,
  adminNotificationEmail
};
