import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
};

export function SheetActions({ children }: Props) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
      {items.map((child, index) => (
        <View key={index} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
