# Shelfwise

**A Personal Library Management and Book Discovery Application**

Shelfwise is a self-hosted application that helps readers manage their personal book collections. Using ISBN scanning or manual entry, you can build a digital catalog of your physical books, complete with cover art, synopses, and series information.

---

## Features

- **User Accounts** - Register and login to keep your library private and secure
- **Remember Me** - Stay signed in for 7 days with the "Remember Me" option
- **ISBN Barcode Scanning** - Use your device's camera to scan book barcodes
- **Manual Entry** - Add books by ISBN or by title/author when ISBN is unavailable
- **Automatic Metadata** - Book details fetched from Open Library and Google Books APIs
- **Series Detection** - Automatically groups books by series
- **Grid & List Views** - Toggle between visual and compact displays
- **Edit Series Info** - Manually correct series groupings when auto-detection fails

---

## Installation Guide (Beginner-Friendly)

This guide will walk you through every step needed to install and run Shelfwise. No prior programming experience required!

### Step 1: Install Node.js

Node.js is the software that runs Shelfwise. You need to install it first.

#### On Windows:
1. Go to https://nodejs.org/
2. Click the big green button that says "LTS" (this is the stable version)
3. Run the downloaded file and follow the installation wizard
4. Click "Next" through all the prompts, keeping the default settings
5. Click "Install" and wait for it to finish
6. Click "Finish"

#### On Mac:
1. Go to https://nodejs.org/
2. Click the big green button that says "LTS"
3. Open the downloaded `.pkg` file
4. Follow the installation prompts, clicking "Continue" and "Agree"
5. Click "Install" (you may need to enter your password)

#### Verify Installation:
1. **Windows**: Press `Windows Key + R`, type `cmd`, and press Enter
2. **Mac**: Press `Cmd + Space`, type `Terminal`, and press Enter
3. Type this command and press Enter:
   ```
   node --version
   ```
4. You should see a version number like `v18.17.0` or higher. If you see an error, restart your computer and try again.

### Step 2: Download Shelfwise

#### Option A: Download as ZIP (Easiest)
1. Go to the Shelfwise repository page on GitHub
2. Click the green "Code" button
3. Click "Download ZIP"
4. Find the downloaded ZIP file (usually in your Downloads folder)
5. **Windows**: Right-click the ZIP and select "Extract All...", then click "Extract"
6. **Mac**: Double-click the ZIP file to extract it
7. Move the extracted folder somewhere you'll remember (like your Documents folder)

#### Option B: Using Git (If you have Git installed)
1. Open Terminal (Mac) or Command Prompt (Windows)
2. Navigate to where you want to put Shelfwise:
   ```
   cd Documents
   ```
3. Clone the repository:
   ```
   git clone https://github.com/yourusername/shelfwise.git
   ```

### Step 3: Open Terminal in the Shelfwise Folder

You need to open a terminal/command prompt window that's "inside" the Shelfwise folder.

#### On Windows:
1. Open File Explorer and navigate to the Shelfwise folder
2. Click in the address bar at the top (where it shows the folder path)
3. Type `cmd` and press Enter
4. A black command prompt window will open

#### On Mac:
1. Open Finder and navigate to the Shelfwise folder
2. Right-click (or Control-click) on the folder
3. Hold the `Option` key and click "Copy 'shelfwise' as Pathname"
4. Open Terminal (Cmd + Space, type "Terminal", press Enter)
5. Type `cd ` (with a space after cd), then paste the path you copied (Cmd + V)
6. Press Enter

**Verify you're in the right place**: Type `ls` (Mac) or `dir` (Windows) and press Enter. You should see files like `package.json` and folders like `server` and `client`.

### Step 4: Install Dependencies

Dependencies are other software packages that Shelfwise needs to work. Run these commands one at a time, waiting for each to finish before running the next.

```bash
npm install
```

Wait for it to finish (this may take 1-2 minutes). You'll see a lot of text scrolling by - that's normal!

Then install the frontend dependencies:

```bash
cd client
npm install
cd ..
```

### Step 5: Set Up the Database

The database is where your book collection will be stored. Run this command:

```bash
npm run db:setup
```

You should see a message saying "Database setup complete!"

### Step 6: Configure Email (Optional)

Shelfwise can send password reset emails using [Resend](https://resend.com). This is optional - the app works without it, but users won't be able to reset forgotten passwords via email.

#### Setting Up Resend:

1. Go to https://resend.com and create a free account
2. In the Resend dashboard, go to **API Keys**
3. Click **Create API Key**, give it a name, and copy the key (it starts with `re_`)
4. When starting Shelfwise, include your API key:

```bash
RESEND_API_KEY=re_your_key_here npm run dev
```

#### For Production:
If you have a custom domain, you can also configure:
- `APP_URL` - Your app's public URL (default: `http://localhost:3000`)
- `FROM_EMAIL` - The sender email address (default: `Shelfwise <onboarding@resend.dev>`)

Example:
```bash
RESEND_API_KEY=re_xxx APP_URL=https://myshelfwise.com FROM_EMAIL="Shelfwise <noreply@myshelfwise.com>" npm run dev
```

**Note**: Without Resend configured, password reset links will be logged to the server console for development purposes.

### Step 7: Start Shelfwise

Run this command to start the application:

```bash
npm run dev
```

Or with email support:
```bash
RESEND_API_KEY=re_your_key_here npm run dev
```

You'll see some messages appear. Wait until you see something like:
```
Shelfwise server running on http://localhost:3001
```

### Step 8: Open Shelfwise in Your Browser

1. Open your web browser (Chrome, Firefox, Safari, Edge, etc.)
2. Type this address in the URL bar and press Enter:
   ```
   http://localhost:3000
   ```

**Congratulations!** You should now see the Shelfwise login page!

### Step 9: Create Your Account

1. Click "Create one" to go to the registration page
2. Enter your email address and choose a password (at least 8 characters)
3. Optionally enter your name
4. Check "Keep me signed in for 7 days" if you want to stay logged in
5. Click "Create Account"

You'll be taken to your library where you can start adding books!

### Stopping Shelfwise

When you're done using Shelfwise, go back to the terminal window and press `Ctrl + C` (on both Windows and Mac). This stops the server.

### Starting Shelfwise Again Later

Whenever you want to use Shelfwise again:
1. Open a terminal in the Shelfwise folder (see Step 3)
2. Run `npm run dev`
3. Open `http://localhost:3000` in your browser

---

## Using Shelfwise

### Logging In
1. Go to `http://localhost:3000`
2. Enter your email and password
3. Check "Remember me for 7 days" to stay logged in longer
4. Click "Sign In"

### Signing Out
- Click "Sign Out" in the top right corner of the library page

### Adding Books by ISBN Scan
1. Click "Scan ISBN" on the main page
2. Allow camera access when prompted
3. Hold a book's barcode up to your camera
4. The book will be automatically added if found

### Adding Books Manually
1. Click "Enter ISBN" to add a book by its ISBN number
2. If the ISBN isn't found, you can enter the title and author manually

### Viewing Your Library
- Use the toggle in the top right to switch between Grid and List views
- Books in the same series are grouped together
- Click the book icon on any book to edit its series information

### Deleting Books
- Hover over a book and click the trash icon to remove it

---

## Troubleshooting

### "command not found: npm" or "'npm' is not recognized"
Node.js isn't installed correctly. Go back to Step 1 and reinstall it. Make sure to restart your terminal/command prompt after installing.

### "EACCES permission denied"
On Mac, you may need to fix npm permissions. Run:
```bash
sudo chown -R $(whoami) ~/.npm
```
Enter your password when prompted.

### The camera doesn't work for scanning
- Make sure you've allowed camera access in your browser
- Try using Chrome if you're on a different browser
- Make sure the barcode is well-lit and clearly visible

### "Cannot find module" errors
Run `npm install` again in the main folder, then `cd client && npm install && cd ..`

### The page is blank or shows an error
1. Make sure both the server and client are running (you should see messages from both in the terminal)
2. Try refreshing the page
3. Check that you're going to `http://localhost:3000` (not 3001)

### Books aren't being found by ISBN
Some books (especially special editions like Fairyloot, Illumicrate, etc.) aren't in the public databases. Use the manual entry option to add these books by title and author.

---

## Technical Details

### Tech Stack
- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Vite, Tailwind CSS
- **ISBN Lookup**: Open Library API, Google Books API
- **Barcode Scanning**: ZXing library

### Project Structure
```
shelfwise/
├── server/           # Backend API
│   ├── db/           # Database files and setup
│   ├── routes/       # API endpoints
│   ├── services/     # ISBN lookup service
│   └── middleware/   # Validation and security
├── client/           # Frontend React app
│   └── src/
│       ├── components/   # React components
│       └── services/     # API client
└── package.json      # Project configuration
```

### API Endpoints

#### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset email |
| GET | `/api/auth/validate-reset-token` | Validate reset token |
| POST | `/api/auth/reset-password` | Reset password with token |

#### Books (Requires Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | List all books |
| GET | `/api/books/:id` | Get single book |
| POST | `/api/books` | Add book manually |
| POST | `/api/books/scan` | Add book via ISBN |
| POST | `/api/books/search` | Add by title/author |
| PUT | `/api/books/:id` | Update book |
| DELETE | `/api/books/:id` | Delete book |
| GET | `/api/books/series/list` | Get all series names |

---

## Security Notes

- **User Authentication**: Secure session-based authentication with bcrypt password hashing
- **Session Management**: Sessions expire after 1 hour by default, or 7 days with "Remember Me"
- **Rate Limiting**: API requests are limited to prevent abuse (10 login attempts per 15 minutes)
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Internal errors are not exposed to users in production
- **CORS**: Cross-origin requests are restricted to the application origin
- **Secure Cookies**: Session cookies are HttpOnly and use SameSite protection

To run in production mode with stricter security:
```bash
npm run start
```

---

## License

MIT License - see LICENSE file for details.
