const path = require("path");
const db = require("../models");

exports.track_redirect = async (req, res, next) => {
  try {
    const { redirect } = req.query;
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).send("Email ID is missing.");
    }

    // Log the email open to your console
    console.log(`Email with UUID ${uid} was cliked the link.`);

    // Update the database to mark the email as opened or increment click count
    const email_log = await db.email_log.findOne({
      where: {
        uuid: uid,
      },
    });
    if(email_log && !email_log.clicked){
      await db.email_log.update(
        {
          clicked: true,
        },
        {
          where: {
            uuid: uid,
          },
        }
      );
    }
    if (redirect) {
      // If redirect is present, perform the redirect
      return res.redirect(redirect);
    }

    // Otherwise, return a 1x1 transparent PNG
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/pyXfEkAAAAASUVORK5CYII=",
      "base64"
    );
    res.send(pixel);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.track_image = async (req, res, next) => {
  try {
    const { redirect } = req.query;
    const { uid } = req.params;

    // Log the email open to your console
    console.log(`Email with UUID ${uid} was opened.`);

    // Update the database to mark the email as opened or increment click count
    if (uid) {
      await db.email_log.update(
        {
          email_oppened_on: new Date(),
        },
        {
          where: {
            email_oppened_on: null,
            uuid: uid,
          },
        }
      );
    }

    if (redirect) {
      // If redirect is present, perform the redirect
      return res.redirect(redirect);
    }

    // Set the correct Content-Type header to render the image
    res.setHeader("Content-Type", "image/avif");

    // Serve the image from the public folder
    const imagePath = path.join(__dirname, "../public", "server_error.avif"); // Make sure this path is correct
    console.log(imagePath);

    res.sendFile(imagePath);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
