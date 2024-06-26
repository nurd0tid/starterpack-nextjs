import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
import { SignJWT } from 'jose';
import supabase from '../../../../supabase';
import nodemailer from 'nodemailer'; // Import nodemailer for sending email

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  try {
    // Fetch user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *, 
        roles ( id, name )
      `)
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log(error)
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if two-factor authentication is enabled
    if (user.two_factor == true) {
      // Generate OTP
      const OTP = generateOTP();

      // Send OTP to user's email
      await sendOTPByEmail(email, OTP);

      // Set OTP in user's record for verification later
      await supabase
        .from('users')
        .update({ otp_code: OTP })
        .eq('email', email);
      
      // Redirect user to OTP verification page
      return res.status(200).json({ email: email });
    }

    // Create JWT token
    const key = new TextEncoder().encode(process.env.JWT_SECRET)
    if (user.roles.name === 'Users') {      
      const token = await new SignJWT({ sun: user.name, sud: user.id, sur: user.roles.id, role: user.roles.name, photo: user.photo })
        .setProtectedHeader({ alg: 'HS256' }) // Set the algorithm
        .setIssuedAt() // Set the time the token was issued
        .setExpirationTime('6h') // Set the expiration time
        .sign(key); // Sign the token with the secret

        // Set cookie
        res.setHeader('Set-Cookie', `currentUser=${JSON.stringify({
          accessToken: token,
          expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(), // 6 hours
        })}; Path=/; HttpOnly`);
    } else {
        const token = await new SignJWT({ sun: user.name, sud: user.id, sur: user.roles.id, role: user.roles.name, photo: user.photo, group_id: user.group_contact })
        .setProtectedHeader({ alg: 'HS256' }) // Set the algorithm
        .setIssuedAt() // Set the time the token was issued
        .setExpirationTime('6h') // Set the expiration time
        .sign(key); // Sign the token with the secret
        
        // Set cookie
        res.setHeader('Set-Cookie', `currentUser=${JSON.stringify({
          accessToken: token,
          expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(), // 6 hours
        })}; Path=/; HttpOnly`);
    }


    // Set Revoked status
    await supabase
      .from('users')
      .update({ revoked_web: false })
      .eq('email', email);

    return res.status(200).json({ message: 'Login successfuly' });
  } catch (error) {
    console.error('Error logging in:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Function to generate OTP
function generateOTP() {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

// Function to send OTP via email
async function sendOTPByEmail(email, OTP) {
  // Create Nodemailer transporter
  let transporter = nodemailer.createTransport({
    host: process.env.HOST_EMAIL,
    port: process.env.PORT_EMAIL,
    secure: process.env.SECURE_EMAIL,
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.PASS_EMAIL,
    },
  });

  // Send OTP email
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'OTP for Two-Factor Authentication',
    text: `Your OTP is: ${OTP}`,
  });
}
