# Installation

## Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- Google Gemini API Key

## Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/gabrielchantayan/imagegen.git
   cd imagegen 
   bun install
   ```

2. **Environment**
   Create `.env`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-3-pro-image-preview
   GEMINI_ANALYSIS_MODEL=gemini-3-pro-preview
   APP_PASSWORD=your_access_password
   JWT_SECRET=random_secure_string
   ```

3. **Database**
   Initialize SQLite database:
   ```bash
   bun db:migrate
   bun db:seed
   ```

4. **Run**
   Start development server:
   ```bash
   bun dev
   ```
   Access at `http://localhost:5250`
