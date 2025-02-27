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
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await prisma.user.findFirst({
            where: {
              email: profile.emails?.[0]?.value,
            },
          });

          if (!user) {
            // Create new user
            user = await prisma.user.create({
              data: {
                email: profile.emails?.[0]?.value || '',
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                authProvider: AuthProvider.GOOGLE,
                profilePicture: profile.photos?.[0]?.value,
                documentRetentionDays: 30, // Default value
              },
            });
          } else if (user.authProvider !== AuthProvider.GOOGLE) {
            // Update existing user to link with Google
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                authProvider: AuthProvider.GOOGLE,
                profilePicture: profile.photos?.[0]?.value || user.profilePicture,
              },
            });
          }

          return done(null, user);
        } catch (error) {
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