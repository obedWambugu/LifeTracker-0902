# Monetization Overhaul

## New Model
- **Trial**: 30 days from email verification, all features, WITH ADS
- **Free (post-trial)**: 3 habits, no journal, no insights, no freezes, no prompts, no export, WITH ADS
- **Pro (KES 300/mo · KES 1,800/yr)**: Everything, NO ADS

## Changes Needed

### 1. Schema — add `email_verified_at` column (trial clock)
### 2. Auth lib — add `isTrial`, `trialDaysLeft`, `isPostTrial` to context
### 3. API — update profile/register/login to return trial info; gate journal/insights for post-trial free
### 4. UpgradeModal — rewrite with KES 300 pricing, new feature list
### 5. AdBanner component — Google AdSense slots (show for non-Pro)
### 6. Dashboard — add ads, gate insights for post-trial
### 7. Journal — gate for post-trial free users
### 8. Habits — 3 limit for post-trial free, ads
### 9. Settings — update pricing, trial status display
### 10. index.html — add AdSense script tag
