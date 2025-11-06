import QRScanner from "../QRScanner";

export default function QRScannerExample() {
  return (
    <QRScanner
      onScan={(ticketId) => {
        console.log("Scanned ticket:", ticketId);
        // Return null to use default mock behavior
        return null;
      }}
    />
  );
}
