# Telegram Admin & User Bot Suite

A comprehensive Telegram bot system designed for managing challenges, broadcasting messages, and facilitating user-sales interactions. Built with Node.js and the Telegram Bot API.



## Features

### Admin Bot Features
- **Custom Broadcasts**: Send text, images, videos, and documents to all users or specific segments.
- **Challenge Management**:
  - Create time-bound challenges with custom rules.
  - Generate unique participation links for each user.
  - Automatic winner selection with tracking system.
- **User Management**:
  - Store user details (Telegram ID, username, phone number, and name).
  - View participant statistics and engagement metrics.
- **Direct Communication**: Instant messaging interface with users.

### User Bot Features
- **Sales Forwarding System**: Automatically route user inquiries to designated sales personnel.
- **Information Display**:
  - Product catalogs with rich media support.
  - Company contact information and business hours.
  - Interactive FAQs and support queries.
- **Challenge Participation**:
  - Join challenges via personalized links.
  - Real-time challenge status updates.

## Technologies Used
- Node.js (v16+)
- Telegraf Framework (Telegram Bot API)
- MongoDB (Data Storage)
- Mongoose (ODM)
- Dotenv (Environment Management)

## Prerequisites
- Telegram account with [BotFather](https://t.me/BotFather) access
- MongoDB Atlas account or local MongoDB instance
- Node.js and npm installed

## Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/telegram-bot-suite.git
   cd telegram-bot-suite
