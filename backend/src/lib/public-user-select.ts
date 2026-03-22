import { Prisma } from "@prisma/client";

const publicUserProfileSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  cityId: true,
  city: {
    select: {
      id: true,
      slug: true,
      name: true,
      countryCode: true,
      timezone: true
    }
  },
  lat: true,
  lng: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserProfileSelect;

const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  status: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: publicUserProfileSelect
  }
} satisfies Prisma.UserSelect;

export { publicUserProfileSelect, publicUserSelect };
