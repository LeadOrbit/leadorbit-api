const cron = require('node-cron');
const jobs = [
  // require('./automate_lists')
  // Add more jobs here
];

function initializeJobs() {
  console.log('Initializing scheduled jobs...');
  
  jobs.forEach(job => {
    if (cron.validate(job.schedule)) {
      cron.schedule(job.schedule, job.run);
      console.log(`✔ Scheduled: ${job.name} (${job.schedule})`);
    } else {
      console.error(`Invalid schedule for job: ${job.name} (${job.schedule})`);
    }
  });
}

module.exports = initializeJobs;