const { v4: uuidv4 } = require("uuid");
const sheetsHelper = require("../lib/google_sheet");
const ejs = require("ejs");
const { sendEmail } = require("../lib/nodemailer");
const db = require("../models/index");
const { delay_time } = require("../constant/index");
const randomDelay = async () => {
  // Generate a random number of seconds between min and max
  let minSeconds = delay_time.minSeconds;
  let maxSeconds = delay_time.maxSeconds;
  const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;

  // Convert seconds to milliseconds for setTimeout
  const delayMilliseconds = randomSeconds * 1000;

  console.log(`Waiting for ${randomSeconds.toFixed(2)} seconds...`);

  // Wait for the random duration
  await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
};

const process_email_send = async (
  sender,
  email_body,
  client,
  client_uri,
  automation_name
) => {
  try {
    // fetch topic for email and create a transporter for sender email
    const emailConfig = {
      name: sender.name, // Name displayed as the sender (Optional)
      emailUser: sender.emailUser, // Your email address
      emailPassword: sender.emailPassword, // Your app password (or email password if not using OAuth2)
      rejectUnauthorized: false, // Allow self-signed certificates if necessary
    };
    if (email_body && email_body.length > 0) {
      // create body for every client , check for blocked email and send email to client and update the record
      const client_name = client["Person Name"];
      const client_email_id = client["Person Email"];
      const blocked_email = await db.blocked_email.findOne({
        where: {
          email_id: client_email_id,
        },
      });
      if (!blocked_email) {
        const client_uuid = uuidv4();
        // <a href="<%= base_url %>?uid=<%= uuid %>&redirect=https://actual-link.com" target="_blank">Click here to view updates</a>
        const email_data = {
          name: client_name,
          base_url: process.env.SERVER_BASE_URL,
          uuid: client_uuid,
          unsubscribe_link: `${process.env.SERVER_BASE_URL}/Account/${client_uuid}/UnsubscribeEmail`,
          company_name: client.company_name ? client.company_name : "",
        };
        const emailHtml = ejs.render(email_body[0].body, email_data);
        const emailSubject = email_body[0].subject;
        const mailOptions = {
          to: client_email_id, // The recipient's email address
          subject: emailSubject, // Email subject
          html: emailHtml, // HTML content of the email
        };
        try {
          await sendEmail(emailConfig, mailOptions).then(async (res) => {
            let accepted = false;
            if (res.accepted.length && res.messageId) {
              accepted = true;
            }
            await db.email_log.create({
              name: client_name,
              uuid: client_uuid,
              email_id: client_email_id,
              subject: emailSubject,
              sender: sender.emailUser,
              body: emailHtml,
              automation_name: automation_name,
              email_delivered: accepted,
            });
          });
        } catch (error) {
          console.log(error);
          console.log(`unable to send email to ${client_email_id}`);
        }
      }
      await sheetsHelper.updateSheetData(
        client_uri,
        {
          sl: client.sl,
          ["Person Email"]: client_email_id,
        },
        "email_send_on",
        new Date()
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (error) {
    throw error;
  }
};

const filter_sender_list_and_update = async (
  sender_list,
  remove_emailUser,
  sender_list_uri
) => {
  // Filter out the sender to remove - this is done synchronously
  const updatedSenders = sender_list.filter(
    (sender) => sender.emailUser !== remove_emailUser
  );

  // Find the sender to update
  const senderToUpdate = sender_list.find(
    (sender) => sender.emailUser === remove_emailUser
  );

  if (senderToUpdate) {
    let now = new Date();
    let nextDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    // Perform asynchronous operations separately (don't use filter)
    await sheetsHelper.updateSheetData(
      sender_list_uri,
      {
        sl: senderToUpdate.sl,
        emailUser: senderToUpdate.emailUser,
        emailPassword: senderToUpdate.emailPassword,
      },
      "total_email_sent",
      0
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await sheetsHelper.updateSheetData(
      sender_list_uri,
      {
        sl: senderToUpdate.sl,
        emailUser: senderToUpdate.emailUser,
        emailPassword: senderToUpdate.emailPassword,
      },
      "limit_reset_on",
      nextDay
    );
  }

  // Return the new, filtered array
  return updatedSenders;
};

exports.process_data = async (automation_data) => {
  try {
    const { contact_list_uri, sender_email_uri, topic_uri, automation_name } =
      automation_data;
    if (contact_list_uri && sender_email_uri) {
      let senders_email = await sheetsHelper.getSheetData(sender_email_uri);
      if (senders_email && senders_email.length > 0) {
        let total_email_limit = 0;
        const sender_email_bucket_with_limit = {};
        // filer with valid senders which have pending limit to send email
        let validSenders = senders_email.filter((sender) => {
          // If the limit_reset_on is not set or has passed, consider them valid
          const isReset =
            !sender.limit_reset_on ||
            new Date() >= new Date(sender.limit_reset_on);
          const isWithinLimit = sender.total_email_sent < sender.limit;

          if (isReset && isWithinLimit) {
            total_email_limit += sender.limit - sender.total_email_sent;
            let temp_obj = {
              limit: sender.limit,
              total_email_sent: sender.total_email_sent,
              matcher: {
                sl: sender.sl,
                emailUser: sender.emailUser,
                emailPassword: sender.emailPassword,
              },
            };
            sender_email_bucket_with_limit[sender.emailUser] = temp_obj;
            return true;
          }
          return false;
        });

        // return the process if all sender have excided there limit
        if (validSenders && validSenders.length <= 0) {
          await new Promise((resolve) => setTimeout(resolve, 60000));
          console.log(`All sender email has excided there limit to send email`);
          return;
        }

        // if we have validsender length then fetch the contact details and slice the list with total no of balance email
        let clients = await sheetsHelper.getSheetData(contact_list_uri);
        const clients_to_send_email = clients.filter(
          (client) => client && !client.email_send_on
        );
        // slicing the list
        const limited_clients = clients_to_send_email.slice(
          0,
          total_email_limit
        );

        for (let client of limited_clients) {
          let randomSenderIndex = Math.floor(
            Math.random() * validSenders.length
          );
          let sender = validSenders[randomSenderIndex];

          const email_body = await sheetsHelper.getSheetData(topic_uri);
          // send the email from sender
          await process_email_send(
            sender,
            email_body,
            client,
            contact_list_uri,
            automation_name
          );

          // first check wheather the limit and total_email sent is equal or not
          sender_email_bucket_with_limit[sender.emailUser].total_email_sent++;

          // check sender email for there completed limit or not
          let sender_check = sender_email_bucket_with_limit[sender.emailUser];

          if (
            sender_check &&
            sender_check.limit == sender_check.total_email_sent
          ) {
            // remove the sender from list and update in sheet also
            validSenders = await filter_sender_list_and_update(
              validSenders,
              sender.emailUser,
              sender_email_uri
            );
            // remove the completed users from bucket list as well
            delete sender_email_bucket_with_limit[sender.emailUser];
          }
          await randomDelay();
        }

        if (
          sender_email_bucket_with_limit &&
          typeof sender_email_bucket_with_limit === "object" &&
          Object.keys(sender_email_bucket_with_limit).length > 0
        ) {
          for (const sender in sender_email_bucket_with_limit) {
            if (sender_email_bucket_with_limit.hasOwnProperty(sender)) {
              const { matcher, total_email_sent } =
                sender_email_bucket_with_limit[sender];
              await randomDelay();
              await sheetsHelper.updateSheetData(
                sender_email_uri,
                matcher,
                "total_email_sent",
                total_email_sent
              );
            }
          }
        }
      }
    }
    return false;
  } catch (error) {
    throw error;
  }
};
