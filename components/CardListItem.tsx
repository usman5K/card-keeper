import { History, Pencil } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { StatusChip } from '@/components/StatusChip';
import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { formatPkr } from '@/utils/money';

type Props = {
  card: FuelCardDoc;
  balance: number | null;
  balanceEstimated: boolean;
  isOwner: boolean;
  showOpening?: boolean;
  pinAction?: {
    label: string;
    onPress: () => void;
    primary?: boolean;
    pending?: boolean;
  } | null;
  onPressCard: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onAddRecharge?: () => void;
  onAddOpening?: () => void;
};

export function CardListItem({
  card,
  balance,
  balanceEstimated,
  isOwner,
  showOpening = false,
  pinAction,
  onPressCard,
  onEdit,
  onHistory,
  onAddRecharge,
  onAddOpening,
}: Props) {
  const { colors } = useTheme();
  const active = card.status === 'active';

  return (
    <View
      style={{
        marginBottom: 16,
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: 16,
          paddingTop: 16,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isOwner
              ? `Edit ${card.name} ending ${card.last4}`
              : `Open ${card.name} ending ${card.last4}`
          }
          style={({ pressed }) => ({
            flex: 1,
            paddingRight: 12,
            minHeight: a11y.minHit,
            opacity: pressed ? 0.92 : 1,
          })}
          onPress={onPressCard}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>
                {card.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                •••• {card.last4}
                {card.issuer ? ` · ${card.issuer}` : ''}
              </Text>
            </View>
            <StatusChip label={card.status} tone={active ? 'success' : 'warning'} />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
              Available
            </Text>
            <Text
              style={{ color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 4 }}
              accessibilityLabel={
                balance == null
                  ? 'Balance unavailable'
                  : `Balance ${formatPkr(balance)}${balanceEstimated ? ', estimated' : ''}`
              }>
              {balance == null ? 'Rs —' : formatPkr(balance)}
            </Text>
            {balance == null ? (
              <Text style={{ color: colors.offline, fontSize: 12, marginTop: 4 }}>
                Balance unavailable · pull to refresh later
              </Text>
            ) : balanceEstimated ? (
              <Text style={{ color: colors.offline, fontSize: 12, marginTop: 4 }}>
                Estimated from ledger
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={{ gap: 8, paddingTop: 2 }}>
          {isOwner ? (
            <IconButton label={`Edit ${card.name}`} onPress={onEdit} color={colors.border}>
              <Pencil color={colors.ink} size={18} />
            </IconButton>
          ) : null}
          <IconButton label={`History for ${card.name}`} onPress={onHistory} color={colors.border}>
            <History color={colors.ink} size={18} />
          </IconButton>
        </View>
      </View>

      {active ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}>
          {isOwner ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {onAddRecharge ? (
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Add recharge"
                    variant="secondary"
                    compact
                    onPress={onAddRecharge}
                  />
                </View>
              ) : null}
              {showOpening && onAddOpening ? (
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Opening"
                    variant="secondary"
                    compact
                    onPress={onAddOpening}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {pinAction?.pending ? (
            <Text style={{ color: colors.muted, fontSize: 14 }}>{pinAction.label}</Text>
          ) : pinAction ? (
            <AppButton
              label={pinAction.label}
              variant={pinAction.primary ? 'primary' : 'secondary'}
              compact
              onPress={pinAction.onPress}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ height: 12 }} />
      )}
    </View>
  );
}

function IconButton({
  label,
  color,
  onPress,
  children,
}: {
  label: string;
  color: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: color,
        opacity: pressed ? 0.7 : 1,
      })}>
      {children}
    </Pressable>
  );
}
