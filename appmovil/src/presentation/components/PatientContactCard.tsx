import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PatientContact } from '@/domain/entities';
import { pickContactCategoryStyle } from '@/domain/utils/contactDisplay';

type Props = {
  contact: PatientContact;
  onEdit: () => void;
};

export default function PatientContactCard({ contact, onEdit }: Props) {
  const style = pickContactCategoryStyle(contact.category);

  function handleCall() {
    Linking.openURL(`tel:${contact.phone}`);
  }

  return (
    <View style={[styles.card, contact.priority && styles.cardPriority]}>
      {contact.priority && (
        <View style={styles.priorityBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.priorityText}>Prioritario</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: style.color }]}>
          <Ionicons name={style.icon} size={26} color="#fff" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{contact.name}</Text>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: style.color }]}>
              <Ionicons name={style.icon} size={12} color="#fff" />
              <Text style={styles.categoryText}>{style.label.toUpperCase()}</Text>
            </View>
            {!!contact.relationship && <Text style={styles.relationship}>{contact.relationship}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.detailsColumn}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={14} color="#5ee7df" />
          <Text style={styles.detailText}>{contact.phone}</Text>
        </View>
        {contact.email ? (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color="#5ee7df" />
            <Text style={styles.detailText}>{contact.email}</Text>
          </View>
        ) : contact.note ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#5ee7df" />
            <Text style={styles.detailText}>{contact.note}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Ionicons name="call" size={18} color="#5ee7df" />
          <Text style={styles.actionText}>Llamar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color="#5ee7df" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
  },
  cardPriority: { borderColor: '#e05555', borderWidth: 1.5 },
  priorityBadge: {
    position: 'absolute', top: -10, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e05555', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  relationship: { color: '#a5d8f3', fontSize: 13 },

  detailsColumn: { gap: 6, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: '#e2e8f0', fontSize: 13 },

  actionsRow: {
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 10,
  },
  actionText: { color: '#5ee7df', fontWeight: '600', fontSize: 13 },
});
