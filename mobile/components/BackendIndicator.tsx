import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { config } from '@/constants/config';

type Status = 'checking' | 'connected' | 'disconnected';

interface HealthInfo {
  status?: string;
  db?: string;
  ai_provider?: string;
  ollama_available?: boolean;
}

export function BackendIndicator() {
  const [status, setStatus] = useState<Status>('checking');
  const [info, setInfo] = useState<HealthInfo>({});
  const [expanded, setExpanded] = useState(false);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const baseUrl = config.API_URL.replace('/api', '');
      const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const color =
    status === 'connected' ? '#34a853' :
    status === 'disconnected' ? '#ea4335' : '#fbbc04';

  const statusLabel =
    status === 'connected' ? 'API Connected' :
    status === 'disconnected' ? 'API Offline' : 'Checking...';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      onLongPress={checkConnection}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      {expanded && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipStatus}>{statusLabel}</Text>
          {info.db && (
            <Text style={[styles.tooltipModel, { color: info.db === 'ok' ? '#81c784' : '#e57373' }]}>
              DB: {info.db}
            </Text>
          )}
          {info.ai_provider && (
            <Text style={styles.tooltipModel}>AI: {info.ai_provider}</Text>
          )}
          <Text style={styles.tooltipUrl}>{config.API_URL}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 12,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tooltip: {
    marginTop: 4,
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 8,
    maxWidth: 220,
  },
  tooltipStatus: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tooltipModel: { color: '#4fc3f7', fontSize: 11, marginTop: 2 },
  tooltipUrl: { color: '#aaa', fontSize: 9, marginTop: 2 },
});
