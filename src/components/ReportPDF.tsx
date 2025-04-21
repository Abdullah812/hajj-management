import { Page, Text, View, Document, StyleSheet, Font, PDFDownloadLink } from '@react-pdf/renderer';
import moment from 'moment-hijri';

// تعطيل الخطوط الافتراضية
Font.clear();

// تسجيل الخطوط المحلية
Font.register({
  family: 'Cairo',
  fonts: [
    {
      src: '/fonts/Cairo-Regular.ttf',
      fontWeight: 'normal'
    },
    {
      src: '/fonts/Cairo-Bold.ttf',
      fontWeight: 'bold'
    },
    {
      src: '/fonts/Cairo-ExtraLight.ttf',
      fontWeight: 'light'
    }
  ]
});

interface ReportPDFProps {
  data: Record<string, any>[];
  reportType: 'pilgrim_groups' | 'centers' | 'stages';
  stats: Array<{
    title: string;
    value: string | number;
    change?: number;
    changeType?: 'increase' | 'decrease';
  }>;
}

interface PilgrimGroup {
  id: number;
  nationality: string;
  count: number;
  created_at: string;
  status: string;
  center_id: number;
  departed_count: number;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    fontWeight: 'normal',
    flexDirection: 'row-reverse',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  section: {
    width: '100%',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    color: '#2c3e50',
  },
  title: {
    fontFamily: 'Cairo',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 15,
    color: '#2980b9',
  },
  date: {
    fontSize: 14,
    color: '#4b5563',
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statBox: {
    width: '30%',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statTitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 40,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
    padding: 10,
    textAlign: 'right',
    fontSize: 12,
    color: '#4b5563',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
    fontFamily: 'Cairo',
    fontWeight: 'light',
  }
});

export const ReportPDF = ({ data, reportType, stats }: ReportPDFProps) => {
  if (!data || data.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>لا توجد بيانات لعرضها.</Text>
        </Page>
      </Document>
    );
  }

  const getReportTitle = () => {
    switch (reportType) {
      case 'pilgrim_groups':
        return 'تقرير مجموعات الحجاج';
      case 'centers':
        return 'تقرير المراكز';
      case 'stages':
        return 'تقرير المراحل';
      default:
        return 'تقرير';
    }
  };

  // دالة تنسيق التاريخ
  const formatDate = (date: string) => {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/[\u0660-\u0669]/g, d => '٠١٢٣٤٥٦٧٨٩'[d.charCodeAt(0) - 0x0660]);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  };

  // دالة تنسيق الأرقام العربية
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '٠';
    return num.toLocaleString('ar-SA').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d.charCodeAt(0) - 48]);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.title}>{getReportTitle()}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statBox}>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statValue}>
                  {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {Object.keys(data[0]).map((header, index) => (
                <Text key={index} style={[styles.tableCell, styles.headerCell]}>
                  {header}
                </Text>
              ))}
            </View>

            {data.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {Object.entries(row).map(([key, value], cellIndex) => (
                  <Text key={cellIndex} style={styles.tableCell}>
                    {typeof value === 'number' ? formatNumber(value) : String(value)}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            {`تم إنشاء هذا التقرير في ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const ExportPDFButton = ({ data, reportType, stats }: ReportPDFProps) => (
  <PDFDownloadLink
    document={<ReportPDF data={data} reportType={reportType} stats={stats} />}
    fileName={`تقرير-${reportType}-${new Date().toLocaleDateString('ar-SA')}.pdf`}
    className="btn btn-secondary"
  >
    تصدير PDF
  </PDFDownloadLink>
);

export default ReportPDF; 