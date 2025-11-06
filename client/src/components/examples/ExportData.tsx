import ExportData from "../ExportData";

// TODO: Remove mock functionality
const mockStats = {
  totalRegistrations: 47,
  qrCodesGenerated: 43,
  totalEntries: 128,
  activeRegistrations: 39,
};

export default function ExportDataExample() {
  return (
    <ExportData
      stats={mockStats}
      onExport={(format, filter) =>
        console.log(`Exporting ${filter} as ${format}`)
      }
    />
  );
}
