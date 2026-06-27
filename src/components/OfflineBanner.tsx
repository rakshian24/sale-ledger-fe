type OfflineBannerProps = {
  isOnline: boolean;
};

export default function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-banner">
      You are offline. Showing the last synced server data. Add, edit, and delete
      are disabled until you are back online.
    </div>
  );
}
