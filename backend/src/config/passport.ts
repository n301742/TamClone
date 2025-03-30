import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../app';
import { AuthProvider, User } from '@prisma/client';

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy
const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

if (!googleClientID || !googleClientSecret) {
  console.warn('⚠️ Google OAuth credentials are missing. Google authentication strategy will not be available.');
} else {
  console.log('✅ Configuring Google OAuth strategy with:');
  console.log(`   - Client ID: ${googleClientID.substring(0, 8)}...`);
  console.log(`   - Callback URL: ${googleCallbackURL}`);
  
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackURL,
        passReqToCallback: true,
        proxy: true,
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
        // Do not add scope here, it will be overridden by the router
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google authentication callback received');
          console.log('Profile:', JSON.stringify(profile, null, 2));
          
          // Check if we have an email
          if (!profile.emails || profile.emails.length === 0) {
            console.error('No email found in Google profile');
            return done(new Error('No email found in Google profile'), undefined);
          }
          
          const email = profile.emails[0].value;
          console.log(`Processing authentication for email: ${email}`);
          
          // Check if user already exists
          let user = await prisma.user.findFirst({
            where: {
              email: email,
            },
          });

          if (!user) {
            console.log('Creating new user from Google profile');
            try {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email: email,
                  firstName: profile.name?.givenName || '',
                  lastName: profile.name?.familyName || '',
                  authProvider: AuthProvider.GOOGLE,
                  profilePicture: profile.photos?.[0]?.value || null,
                  documentRetentionDays: 30, // Default value
                },
              });
              console.log(`New user created with ID: ${user.id}`);
            } catch (createError) {
              console.error('Error creating user:', createError);
              return done(createError as Error, undefined);
            }
          } else if (user.authProvider !== AuthProvider.GOOGLE) {
            console.log('Updating existing user to link with Google');
            try {
              // Update existing user to link with Google
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  authProvider: AuthProvider.GOOGLE,
                  profilePicture: profile.photos?.[0]?.value || user.profilePicture,
                },
              });
              console.log(`User updated with ID: ${user.id}`);
            } catch (updateError) {
              console.error('Error updating user:', updateError);
              return done(updateError as Error, undefined);
            }
          } else {
            console.log(`Existing Google user found with ID: ${user.id}`);
          }

          return done(null, user);
        } catch (error) {
          console.error('Error in Google authentication:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}); 