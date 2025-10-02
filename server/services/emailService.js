// Simple email service for development
// In production, integrate with services like SendGrid, AWS SES, or Nodemailer

const emailService = {
  // Send temporary password email
  sendTemporaryPassword: async (email, name, tempPassword) => {
    try {
      // In development, just log to console
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL NOTIFICATION (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Subject: Temporary Password for HQDMS Account`);
      console.log('');
      console.log(`Dear ${name},`);
      console.log('');
      console.log('You have requested a password reset for your HQDMS account.');
      console.log('');
      console.log('Your temporary password is:');
      console.log(`🔑 ${tempPassword}`);
      console.log('');
      console.log('Please login with this temporary password and change it immediately.');
      console.log('');
      console.log('This temporary password will expire in 24 hours.');
      console.log('');
      console.log('Best regards,');
      console.log('HQDMS Team');
      console.log('='.repeat(60) + '\n');

      // In production, you would implement actual email sending here:
      /*
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        // Your email service configuration
      });
      
      await transporter.sendMail({
        from: 'noreply@hqdms.com',
        to: email,
        subject: 'Temporary Password for HQDMS Account',
        html: `
          <h2>Password Reset Request</h2>
          <p>Dear ${name},</p>
          <p>You have requested a password reset for your HQDMS account.</p>
          <p>Your temporary password is: <strong>${tempPassword}</strong></p>
          <p>Please login with this temporary password and change it immediately.</p>
          <p>This temporary password will expire in 24 hours.</p>
          <p>Best regards,<br>HQDMS Team</p>
        `
      });
      */

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, message: 'Failed to send email' };
    }
  },

  // Send password change confirmation
  sendPasswordChangeConfirmation: async (email, name) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL NOTIFICATION (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Subject: Password Changed Successfully`);
      console.log('');
      console.log(`Dear ${name},`);
      console.log('');
      console.log('Your password has been successfully changed.');
      console.log('');
      console.log('If you did not make this change, please contact support immediately.');
      console.log('');
      console.log('Best regards,');
      console.log('HQDMS Team');
      console.log('='.repeat(60) + '\n');

      return { success: true, message: 'Confirmation email sent successfully' };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, message: 'Failed to send confirmation email' };
    }
  }
};

module.exports = emailService;

