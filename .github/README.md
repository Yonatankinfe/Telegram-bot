# Telegram Admin & User Bot Suite 

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) 
![License](https://img.shields.io/badge/License-MIT-blue) 
![Dependencies](https://img.shields.io/badge/dependencies-telegraf%20|%20mongodb%20|%20mongoose-orange)

Enterprise-grade Telegram bot system for challenge management, sales automation, and mass communication. Built with battle-tested Node.js stack.

---

## 🚀 Key Features
+ 🕒 Time-bound competitions with configurable durations

+ 🔗 Unique participant links (UUIDv4 + HMAC validation)

+ 🏆 Real-time leaderboard with Redis caching

+ 📊 Advanced analytics dashboard
### ⚡ Admin Bot Core

#### Challenge Management
- Time-bound competitions with auto-winner selection
- Custom participation links generation (UUIDv4)
- Real-time leaderboard tracking

#### Broadcast System
- Multi-format messaging (text/image/video/documents)
- Scheduled campaigns with send-rate controls
- User segmentation by engagement level
## 👤 User Bot Core
### Sales Automation
+ 🛒 Interactive product carousels

+ 🔄 Order status tracking with webhooks

+ 💬 Live chat handoff to human agents

+ 📦 Inventory sync with external APIs

### Data Management
+ 🛡️ GDPR-compliant PII handling

+ 📆 Challenge participation history

+ 📊 Interaction analytics pipeline

+ 🔄 Data export/portability tools

## 🛠 Tech Stack
+ Runtime: Node.js 18+

+ Framework: Telegraf (Telegram Bot API)

+ Database: MongoDB Atlas (NoSQL)

+ ORM: Mongoose ODM

+ Security: Bcrypt hashing + Encryption-at-rest

## 📦 Installation

1. **Clone Repository**
```bash
   git clone https://github.com/yourusername/telegram-bot-suite.git
   cd telegram-bot-suite
 ```
## 🌟 Roadmap
+ Multi-admin role system

+ SMS verification layer

+ Premium challenge tiers

+ AI-powered spam detection

+ Revenue dashboard (Stripe integration)


### Development Setup
+ Fork repository and create feature branch
+ Include Jest tests for all new features

+ Maintain 90%+ test coverage

+ Update documentation accordingly

+ Submit PR with detailed changelog
  
```bash
git clone https://github.com/Yonatankinfe/Telegram-bot.git
cd telegram-bot-suite
npm install
npm run dev
```
# Testing
🧪 This project uses Jest for comprehensive unit testing. We heavily rely on mocking to test logic in isolation from external services and files, making tests fast and reliable.
Mocks include:
+ 🤖 Telegram Bot API (node-telegram-bot-api): Simulate bot interactions.
+ 💾 File System (fs, path): Read/write virtual files.
+ 🌐 HTTP Requests (axios): Mock external API calls like media downloads.
+ 📊 CSV Handling (csv-parser, json2csv): Control data parsing and generation.

Tests cover key flows like:
+ 👋 Admin /start & Menu Actions
+ 📢 Sending Mass Messages (Text & Media)
+ 🏆 Challenge Setup & Data Saving
+ ✨ Winner Picking Logic (Data Filtering & Selection)
+ ✅ Input Validations

To run the tests:
```bash
npm test
```
Please ensure your contributions include tests and pass the suite!
```bash
npm run lint    # Code style check
npm run audit   # Security audit
```
## 🤝 Contribution Guidelines
