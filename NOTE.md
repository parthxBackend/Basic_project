# NOTE.md — A Developer's Note on This Project

I built this Group Study Management System as a full-stack college placement project using tools I find practical and interview-friendly.

For the **backend**, I chose **Node.js with Express** because it's lightweight and lets me set up a REST API quickly. I used **MongoDB with Mongoose** as the database because the group-member relationship maps naturally to documents — a group simply stores an array of member IDs. Mongoose also handles schema validation for me, so I don't have to write repetitive checks.

For **authentication**, I used **bcryptjs** to hash passwords before saving them. I never store plain text. Tokens are issued using **jsonwebtoken** (JWT) and expire in one day. The key principle I followed: the `userId` is always read from the verified token, never from the request body — this prevents a user from faking another user's identity.

I enforced **role-based access** with a small middleware that checks `req.user.role`. Admin routes reject students even if they have a valid token. The same membership check runs on the server for every message read and write — not just in the UI.

The **frontend** is plain HTML, CSS, and vanilla JavaScript with no framework. I used CSS custom properties for a consistent dark theme and `textContent` everywhere user data is displayed to prevent XSS attacks.

I'm most proud of how **edge cases are handled cleanly**: duplicate joins return a 409, non-member API calls return a 403, invalid ObjectIds return a 400 instead of crashing, and admins can't delete themselves.

*Word count: ~220*
