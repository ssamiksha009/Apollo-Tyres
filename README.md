Run npm init -y to create a package.json file
npm install
Install required packages: npm install express mysql2 bcrypt jsonwebtoken
For development: npm install nodemon --save-dev
npm install express
npm install pg
npm install bcrypt
npm install multer

## Docker Setup

### Using Docker Compose (Recommended)
1. Install Docker and Docker Compose
2. Run `docker-compose up --build` to start both the app and database
3. The application will be available at http://localhost:3000

### Using Docker without Compose
1. Build the image: `docker build -t apollo-tyres-app .`
2. Run the container: `docker run -p 3000:3000 apollo-tyres-app`

## Database Setup

-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS apollo_tyres;


-- Note: The script in server.js will handle creating an admin user
-- with email: admin@apollotyres.com and password: Apollo@123


