const TelegramBot = require('node-telegram-bot-api'); 
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const axios = require('axios');

const challengeLinkBase = "https://t.me/bot_name_Bot?start="; // Set the base link here


// Admin Bot token
const adminBotToken = 'Admin Bot token'; // Replace with Admin Bot token 
const adminBot = new TelegramBot(adminBotToken, { polling: true });

// User Bot token
const userBotToken = 'User Bot token'; // Replace with User Bot token  
const userBot = new TelegramBot(userBotToken);

// Path to the shared CSV file containing user data
const csvFilePath = path.join(__dirname, 'phone_numbers.csv');

const refFilePath = path.join(__dirname, 'ref.csv');

// Path to the shared CSV file for challenges
const challengeFilePath = path.join(__dirname, 'challenge_data.csv');
// Array of allowed admin user IDs
const allowedAdmins = [801222539]; // Replace with your Telegram user ID

// Middleware to check if the user is an admin
const isAdmin = (chatId) => allowedAdmins.includes(chatId);

// Store admin states (used to track if admin is entering a message or sending media)
const adminState = {};

const isValidDate = (dateString) => {
  // Check if the date is in dd/mm/yyyy format and valid
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(dateString)) return false;

  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};
// Function to get unique user data (userId and first name) from the CSV file
// Helper to get unique user data from CSV
const getUniqueUserData = async () => {
  const data = fs.readFileSync(csvFilePath, 'utf8').trim().split('\n').slice(1);
  return data.map(line => {
    const [userId, username, firstName] = line.split(',');
    return { userId: userId.trim(), firstName: firstName.trim() };
  });
};

// Function to download the file locally
const downloadFile = async (url, filePath) => {
  const writer = fs.createWriteStream(filePath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// Function to send messages to all users
const sendGeneralMessageToAllUsers = async (message, media = null) => {
  const userData = await getUniqueUserData();
  for (const { userId, firstName } of userData) {
    try {
      const personalized = `Hello ${firstName}, ${message}\n`; // For other general messages
      await userBot.sendMessage(userId, personalized);

      if (media) {
        const { type, filePath, caption } = media;
        const personalizedCaption = `Hello ${firstName}, ${caption || ''}`;
        if (type === 'photo') {
          await userBot.sendPhoto(userId, filePath, { caption: personalizedCaption });
        } else if (type === 'video') {
          await userBot.sendVideo(userId, filePath, { caption: personalizedCaption });
        }
      }
    } catch (err) {
      console.error(`Failed to send message to ${userId}:`, err.message);
    }
  }
};



// Sending a general text message to all users
adminBot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (adminState[chatId] === 'awaiting_text_message') {
    const message = msg.text;
    adminState[chatId] = null;

    adminBot.sendMessage(chatId, "Sending your general message to all users...");
    try {
      await sendGeneralMessageToAllUsers(message);
      adminBot.sendMessage(chatId, "✅ Your general message has been sent to all users!");
    } catch (error) {
      adminBot.sendMessage(chatId, `❌ An error occurred while sending messages: ${error}`);
    }
  }
});

// Sending challenge messages to all users with unique links
adminBot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (adminState[chatId]?.stage === 'awaiting_broadcast_message') {
    const broadcastMessage = msg.text;
    const challengeId = Date.now();

    const challengeData = {
      id: challengeId,
      participants: adminState[chatId].participants,
      start_date: adminState[chatId].start_date,
      end_date: adminState[chatId].end_date,
      details: adminState[chatId].challenge_details,
      message: broadcastMessage,
      status: 'Approved',
    };

    try {
      await sendChallengeMessageToAllUsers(broadcastMessage);
      updateUserDataWithChallenge(challengeId, challengeLinkBase, adminState[chatId].participants);
      writeChallengeToCSV(challengeData);
      adminBot.sendMessage(chatId, "Challenge sent to all participants and saved.");
    } catch (error) {
      adminBot.sendMessage(chatId, `Error sending challenge: ${error}`);
    }
  }
});

const sendChallengeMessageToAllUsers = async (message) => {
  const userData = await getUniqueUserData();
  for (const { userId, firstName } of userData) {
    try {
      const challengeLink = `${challengeLinkBase}user_id=${userId}`;
      const personalizedMessage = `Hello ${firstName}, ${message}\n\nYour unique link: ${challengeLink}`; // For challenge messages with link
      await userBot.sendMessage(userId, personalizedMessage);
    } catch (err) {
      console.error(`Failed to send challenge message to ${userId}:`, err.message);
    }
  }
};
const readCSV = (filePath) => {
  const data = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = data[0].split(','); // Extract headers
  return data.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index].trim();
      return acc;
    }, {});
  });
  return data.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((acc, header, index) => {
      // Ensure the value exists before accessing .trim()
      acc[header] = values[index] ? values[index].trim() : '';
      return acc;
    }, {});
  });
};

// Listen for the '/start' command
adminBot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Check if the user is an admin
  if (!isAdmin(chatId)) {
    adminBot.sendMessage(chatId, "You are not authorized to use this bot.");
    return;
  }

  try {
    // Get the count of unique users in the system
    const uniqueUserCount = (await getUniqueUserData()).length;

    // Send welcome message to admin with options
    adminBot.sendMessage(
      chatId,
      `Welcome, Admin! 👋\n\n📊 There are currently **${uniqueUserCount} unique users** in the system.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📨 Send Text Message to All", callback_data: 'send_text_message_to_all' }],
            [{ text: "🖼️ Send Media to All", callback_data: 'send_media_to_all' }],
            [{ text: "🎉 Start a Challenge", callback_data: 'start_challenge' }],
            [{ text: "🏆 Pick A Winner ", callback_data: 'pick_a_winner' }]
          ]
        }
      }
    );
  } catch (error) {
    adminBot.sendMessage(chatId, `An error occurred: ${error}`);
  }
});



// Handle button presses
adminBot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (!isAdmin(chatId)) {
    adminBot.sendMessage(chatId, "❌You are not authorized to use this bot.");
    return;
  }

  if (data === 'send_text_message_to_all') {
    adminState[chatId] = 'awaiting_text_message';
    adminBot.sendMessage(chatId, "Please enter the text message you want to send to all users:");
  } else if (data === 'send_media_to_all') {
    adminState[chatId] = 'awaiting_media';
    adminBot.sendMessage(
      chatId,
      "Please send the media (image or video) you want to share with all users. You can also include a caption."
    );
  } else if (data === 'start_challenge') {
    // Ask the admin to input the number of people involved in the challenge
    adminState[chatId] = { stage: 'awaiting_challenge_participants' };
    adminBot.sendMessage(chatId, "Please enter the number of people involved in the challenge:");
  } else if (data.startsWith('challenge_')) {
    // Handle specific challenge selection
    const challengeType = data.replace('challenge_', '').replace(/_/g, ' '); // Get the type of challenge
    adminState[chatId] = `selected_${challengeType}_challenge`;

    adminBot.sendMessage(chatId, `You have selected a ${challengeType} challenge. Please enter details for the challenge.`);
  }
});

// Listen for media or messages from the admin
adminBot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (adminState[chatId] === 'awaiting_text_message') {
    const message = msg.text;
    adminState[chatId] = null;

    adminBot.sendMessage(chatId, "Sending your message to all users...");
    try {
      await sendGeneralMessageToAllUsers(message);
      adminBot.sendMessage(chatId, "✅ Your message has been sent to all users!");
    } catch (error) {
      adminBot.sendMessage(chatId, `❌ An error occurred while sending messages: ${error}`);
    }
  } else if (adminState[chatId] === 'awaiting_media') {
    if (msg.photo || msg.video) {
      const media = msg.photo ? msg.photo.pop() : msg.video;
      const fileId = media.file_id;
      const type = msg.photo ? 'photo' : 'video';
      const caption = msg.caption || '';

      const fileUrl = await adminBot.getFileLink(fileId);
      const localFilePath = path.join(__dirname, 'temp_media_file');

      await downloadFile(fileUrl, localFilePath);
      adminState[chatId] = null;

      adminBot.sendMessage(chatId, "Sending your media to all users...");
      try {
        await sendGeneralMessageToAllUsers(null, { type, filePath: localFilePath, caption });
        adminBot.sendMessage(chatId, "✅ Your media has been sent to all users!");
        fs.unlinkSync(localFilePath);
      } catch (error) {
        adminBot.sendMessage(chatId, `❌ An error occurred while sending media: ${error}`);
      }
    } else {
      adminBot.sendMessage(chatId, "Please send a valid image or video.");
    }
  }   if (adminState[chatId]?.stage === 'awaiting_challenge_participants') {
    const participants = parseInt(msg.text, 10);
    if (isNaN(participants) || participants <= 0) {
      adminBot.sendMessage(chatId, "Please enter a valid number of participants.");
      return;
    }
  }
});
// Function to write challenge data to CSV
const writeChallengeToCSV = (challenge) => {
  const exists = fs.existsSync(challengeFilePath);
  const row = [
    challenge.id,
    challenge.participants,
    challenge.start_date,
    challenge.end_date,
    challenge.details,
    challenge.message,
    challenge.status,
  ].join(',');
  
  fs.appendFileSync(challengeFilePath, `${exists ? '' : 'CHALLENGE_ID,PARTICIPANTS,START_DATE,END_DATE,DETAILS,MESSAGE,STATUS\n'}${row}\n`);
};
adminBot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (!isAdmin(chatId)) {
    adminBot.sendMessage(chatId, "You are not authorized to use this bot.");
    return;
  }

  if (adminState[chatId]?.stage === 'awaiting_challenge_participants') {
    const participants = parseInt(msg.text, 10);
    if (isNaN(participants) || participants <= 0) {
      adminBot.sendMessage(chatId, "Please enter a valid number of participants.");
      return;
    }

    adminState[chatId] = { stage: 'awaiting_start_date', participants };
    adminBot.sendMessage(chatId, "Please enter the start date in the format `dd/mm/yyyy`:", {
      parse_mode: 'Markdown',
    });
  } else if (adminState[chatId]?.stage === 'awaiting_start_date') {
    const startDate = msg.text;

    if (!isValidDate(startDate)) {
      adminBot.sendMessage(chatId, "❌ Invalid date format. Please enter the start date in `dd/mm/yyyy` format.");
      return;
    }

    adminState[chatId].start_date = startDate;
    adminState[chatId].stage = 'awaiting_end_date';

    adminBot.sendMessage(chatId, "✅ Start date recorded. Now, please enter the end date in the format `dd/mm/yyyy`:", {
      parse_mode: 'Markdown',
    });
  } else if (adminState[chatId]?.stage === 'awaiting_end_date') {
    const endDate = msg.text;

    if (!isValidDate(endDate)) {
      adminBot.sendMessage(chatId, "❌ Invalid date format. Please enter the end date in `dd/mm/yyyy` format.");
      return;
    }

    adminState[chatId].end_date = endDate;

    const { participants, start_date } = adminState[chatId];
    adminBot.sendMessage(
      chatId,
      `✅ End date recorded. Please provide additional details for the challenge:`,
      { parse_mode: 'Markdown' }
    );

    adminState[chatId].stage = 'awaiting_challenge_details';
  } else if (adminState[chatId]?.stage === 'awaiting_challenge_details') {
    const challengeDetails = msg.text;

    adminState[chatId].challenge_details = challengeDetails;

    const { participants, start_date, end_date } = adminState[chatId];
    adminBot.sendMessage(
      chatId,
      `✅ Challenge details received!\n\n📅 **Final Challenge Summary**:\n- Number of Participants: ${participants}\n- Start Date: ${start_date}\n- End Date: ${end_date}\n- Details: ${challengeDetails}\n\nDo you want to approve this challenge?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Approve", callback_data: 'approve_challenge' }],
            [{ text: "❌ Deny", callback_data: 'deny_challenge' }],
          ],
        },
      }
    );

    adminState[chatId].stage = 'awaiting_challenge_confirmation';
  }
});


// Handle button presses for challenge confirmation
adminBot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (adminState[chatId]?.stage === 'awaiting_challenge_confirmation') {
    if (data === 'approve_challenge') {
      adminBot.sendMessage(
        chatId,
        "✅ Challenge approved! Please enter the message to send to all participants:"
      );

      adminState[chatId].stage = 'awaiting_broadcast_message';
    } else if (data === 'deny_challenge') {
      adminState[chatId] = null; // Clear state

      adminBot.sendMessage(chatId, "❌ Challenge denied and cleared.");
    }
  }
});
const updateUserDataWithChallenge = (challengeId, challengeLinkBase, participantsRequired) => {
  const userFileHeader = "USER ID,USER NAME,NAME,CHALLENGE ID,CHALLENGE LINK,INVITED PEOPLES";
  fs.readFile(csvFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading user data file:', err);
      return;
    }

    // Parse the CSV file
    const rows = data.trim().split('\n');
    const header = rows[0].trim();
    const existingData = rows.slice(1).map(row => row.split(','));

    // Ensure the header is correct
    if (header !== userFileHeader) {
      console.error('CSV file header mismatch.');
      return;
    }

    // Create a map of existing users for quick lookup
    const userMap = new Map();
    for (const row of existingData) {
      const [userId, username, name, challengeId, challengeLink, invitedPeoples] = row;
      userMap.set(userId.trim(), { userId, username, name, challengeId, challengeLink, invitedPeoples });
    }

    // Update or add user rows
    const newRows = [];
    for (const [userId, user] of userMap.entries()) {
      const challengeLink = `${challengeLinkBase}user_id=${userId.trim()}`;
      if (user.challengeId === challengeId.toString()) {
        // Update existing row
        newRows.push([
          userId,
          user.username,
          user.name,
          challengeId,
          `"${challengeLink}"`,
          participantsRequired,
        ].join(','));
      } else {
        // Add new challenge data
        newRows.push([
          userId,
          user.username,
          user.name,
          challengeId,
          `"${challengeLink}"`,
          participantsRequired,
        ].join(','));
      }
    }

    // Write data back to the CSV file
    fs.writeFileSync(csvFilePath, `${userFileHeader}\n${newRows.join('\n')}\n`, 'utf8');
    console.log('User data successfully updated with challenge links.');
  });
};
const getChallengesFromCSV = () => {
  if (!fs.existsSync(challengeFilePath)) {
    return [];
  }

  const data = fs.readFileSync(challengeFilePath, 'utf8').trim().split('\n');
  const challenges = data.slice(1).map(line => {
    const [id, participants, startDate, endDate, details, message, status] = line.split(',');
    return {
      id: id.trim(),
      name: details.trim(),
      participants: participants.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      status: status.trim(),
    };
  });

  // Filter out completed or invalid challenges (if needed)
  return challenges.filter(challenge => challenge.status === 'Approved');
};



// Function to retrieve challenges from the CSV file
adminBot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'pick_a_winner') {
    // Fetch challenges from the CSV file
    const challenges = getChallengesFromCSV();

    if (challenges.length === 0) {
      adminBot.sendMessage(chatId, "⚠️ No challenges are available currently.");
      return;
    }

    // Generate inline keyboard buttons for each challenge
    const buttons = challenges.map(challenge => [
      { text: challenge.name, callback_data: `winner_${challenge.id}` }
    ]);

    adminBot.sendMessage(chatId, "📋 These are the available challenges:", {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } else if (data.startsWith('winner_')) {
    // Extract challenge ID from callback data
    const challengeId = data.split('_')[1];

    // Fetch challenges again to find the selected one
    const challenges = getChallengesFromCSV();
    const selectedChallenge = challenges.find(challenge => challenge.id === challengeId);

    if (selectedChallenge) {
      // Store details in variables
      const REQUIRED_PARTICIPANTS = selectedChallenge.participants;
      const STARTING_DATE = selectedChallenge.startDate;
      const ENDING_DATE = selectedChallenge.endDate;
      const CHALLENGE_NAME = selectedChallenge.name;
      const removeDuplicates = (data) => {
        const seen = new Set();
        return data.filter(row => {
          const identifier = `${row.userId},${row.username},${row.timestamp}`;
          if (seen.has(identifier)) {
            return false;
          }
          seen.add(identifier);
          return true;
        });
      };
      const processReferrals = (filePath, requiredParticipants) => {
  const rows = [];
  const userCounts = {};

  // Step 1: Load and parse the CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      rows.push(row);
      const userId = row.userId;
      
      // Count occurrences of each userId
      if (userId in userCounts) {
        userCounts[userId]++;
      } else {
        userCounts[userId] = 1;
      }
    })
    .on('end', () => {
      console.log('CSV file successfully processed.');

      // Step 2: Filter rows based on the required participants condition
      const filteredRows = rows.filter(row => {
        const userId = row.userId;
        return userCounts[userId] >= requiredParticipants;
      });

      // Step 3: Write the filtered data back to the CSV file
      const headers = Object.keys(rows[0]); // Extract headers from the first row
      const output = parse(filteredRows, { header: true, columns: headers });
      fs.writeFileSync(filePath, output, 'utf8');
      console.log(`Filtered data written to ${filePath}.`);
    })
    .on('error', (error) => {
      console.error(`Error reading CSV file: ${error.message}`);
    });
};

      // Function to remove duplicate rows from a CSV file
const removeDuplicateRows = (filePath) => {
  const data = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  
  // Extract headers and rows
  const headers = data[0];
  const rows = data.slice(1);
  
  // Use a Set to filter unique rows based on entire row content
  const uniqueRows = Array.from(new Set(rows));
  
  // Combine headers with unique rows
  const updatedData = [headers, ...uniqueRows].join('\n');
  
  // Overwrite the file with filtered content
  fs.writeFileSync(filePath, updatedData, 'utf8');
};
const parseDate = (dateString) => {
  // Parse DD/MM/YYYY format to a Date object
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

const checkAndFilterRowsByDate = (refFilePath, startingDate, endingDate) => {
  // Parse input dates
  const startDate = parseDate(startingDate);
  const endDate = parseDate(endingDate);

  // Read and parse the CSV
  const data = fs.readFileSync(refFilePath, 'utf8').trim().split('\n');
  const headers = data[0]; // Keep headers
  const rows = data.slice(1);

  // Determine the index of the 'time' column
  const headerColumns = headers.split(',');
  const timeColumnIndex = headerColumns.indexOf('time');
  if (timeColumnIndex === -1) {
    console.error('Error: No "time" column found in CSV headers.');
    return;
  }

  // Filter rows that fall within the date range
  const filteredRows = rows.filter(row => {
    const columns = row.split(',');
    const timeValue = columns[timeColumnIndex]?.trim();

    // Skip rows with empty or invalid time values
    if (!timeValue) return false;

    const rowDate = parseDate(timeValue);
    if (isNaN(rowDate)) {
      console.warn(`Skipping row with invalid date: ${timeValue}`);
      return false;
    }

    return rowDate >= startDate && rowDate <= endDate;
  });

  // Rewrite the CSV with the filtered rows
  const updatedCSV = [headers, ...filteredRows].join('\n');
  fs.writeFileSync(refFilePath, updatedCSV);

  console.log('Rows filtered successfully. Updated CSV saved.');
};



checkAndFilterRowsByDate(refFilePath, STARTING_DATE, ENDING_DATE);
// Example usage
removeDuplicateRows(refFilePath);
// Read the updated data
const rows = fs.readFileSync(refFilePath, 'utf8').trim().split('\n').slice(1); // Skip headers
if (rows.length === 0) {
  adminBot.sendMessage(chatId, "No participants available to pick a winner.");
  return;
}
      const pickRandomWinner = (data) => {
        const uniqueData = removeDuplicates(data);
        if (uniqueData.length === 0) {
          throw new Error("No eligible entries after removing duplicates.");
        }
        const winnerIndex = Math.floor(Math.random() * uniqueData.length);
        return uniqueData[winnerIndex];
      };

      // Respond with the selected challenge details
      adminBot.sendMessage(chatId, `🎉 Challenge Selected: \n\n
        Name: ${CHALLENGE_NAME}
        Participants Required: ${REQUIRED_PARTICIPANTS}
        Start Date: ${STARTING_DATE}
        End Date: ${ENDING_DATE}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍾 Randomly Select a Winner', callback_data: `select_winner_${challengeId}` }]
          ]
        }
        
      });
    
    } else {
      adminBot.sendMessage(chatId, "⚠️ Challenge not found.");
    }
    
  }
  
});

console.log("Admin Bot is Running...")


