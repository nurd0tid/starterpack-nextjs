import supabase from '../../../../supabase';
// import jwt from 'jsonwebtoken';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, otp } = req.body;

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
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    // Check if OTP matches
    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Clear OTP from user's record
    await supabase
      .from('users')
      .update({ otp_code: null, revoked_web: false })
      .eq('email', email);

    // Create JWT token
    // const token = jwt.sign(
    //   { 
    //     sun: user.name, 
    //     sud: user.id, 
    //     sur: user.role_id,
    //     role: user.roles.name,
    //   },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '6h' }
    // );

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

    return res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
