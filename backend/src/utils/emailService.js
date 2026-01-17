import sendEmail from "./sendEmail.js";

/* =========================
   SEND EMAIL NOTIFICATION WHEN "SENT FOR CLOSURE"
========================= */
export const sendTicketClosureRequest = async (ticket, requester) => {
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 Ticket Ready for Closure: ${ticket.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ticket Ready for Closure</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Ticket ID:</strong> ${ticket._id}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Requested by:</strong> ${requester.name} (${requester.email})</p>
          </div>

          <p>A team member has marked this ticket as complete and is requesting closure.</p>
          
          <p><strong>Description:</strong></p>
          <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">
            ${ticket.description}
          </p>

          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket._id}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Ticket
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated email from TaskFlow. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Closure request email sent to admin");
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

/* =========================
   SEND TICKET REJECTION NOTIFICATION
========================= */
export const sendTicketRejection = async (ticket, admin, assignee) => {
  try {
    if (!assignee || !assignee.email) {
      console.log("No assignee to notify");
      return { success: false, error: "No assignee" };
    }

    await sendEmail({
      to: assignee.email,
      subject: `🔄 Ticket Needs Revision: ${ticket.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Ticket Needs Revision</h2>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p><strong>Ticket ID:</strong> ${ticket._id}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Returned by:</strong> ${admin.name}</p>
          </div>

          <p>The admin has reviewed your ticket and moved it back to "In Progress" for revision.</p>
          
          <p><strong>Original Description:</strong></p>
          <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #6b7280;">
            ${ticket.description}
          </p>

          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket._id}" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Ticket
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated email from TaskFlow. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Rejection email sent to assignee");
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

/* =========================
   SEND TICKET CLOSED NOTIFICATION
========================= */
export const sendTicketClosed = async (ticket, admin, creator) => {
  try {
    if (!creator || !creator.email) {
      console.log("No creator to notify");
      return { success: false, error: "No creator" };
    }

    await sendEmail({
      to: creator.email,
      subject: `✅ Ticket Closed: ${ticket.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Ticket Closed Successfully</h2>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p><strong>Ticket ID:</strong> ${ticket._id}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Closed by:</strong> ${admin.name}</p>
            <p><strong>Closure Date:</strong> ${new Date(ticket.closedDate).toLocaleString()}</p>
          </div>

          <p>Your ticket has been reviewed and closed by the admin.</p>

          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket._id}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Ticket
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated email from TaskFlow. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Closure email sent to creator");
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
};