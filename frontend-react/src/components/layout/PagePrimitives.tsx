import {
  Box,
  Center,
  Flex,
  Heading,
  HStack,
  Icon,
  Spinner,
  Stack,
  Text,
  VStack,
  type BoxProps,
  type CenterProps,
} from '@chakra-ui/react';
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import { isValidElement, type ElementType, type ReactNode } from 'react';
import {
  ShellLiveIndicator,
  ShellSectionEyebrow,
  ShellSurface,
  ShellTelemetryBadge,
} from './ShellPrimitives';

type Tone = 'default' | 'info' | 'success' | 'warning' | 'critical';

const toneColorMap: Record<Tone, string> = {
  default: 'sos.blue.400',
  info: 'sos.blue.400',
  success: 'sos.green.400',
  warning: 'sos.amber.400',
  critical: 'sos.red.400',
};

const toneBackgroundMap: Record<Tone, string> = {
  default: 'rgba(0,122,255,0.10)',
  info: 'rgba(0,122,255,0.10)',
  success: 'rgba(52,199,89,0.12)',
  warning: 'rgba(255,149,0,0.12)',
  critical: 'rgba(255,59,48,0.12)',
};

const renderIconNode = (
  icon: ReactNode | ElementType | undefined,
  color: string,
  boxSize = 5,
) => {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;

  return <Icon as={icon as ElementType} boxSize={boxSize} color={color} />;
};

export interface PageHeaderProps extends BoxProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon | ElementType;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
  meta,
  ...props
}: PageHeaderProps) {
  return (
    <ShellSurface variant="toolbar" px={{ base: 4, md: 5 }} py={{ base: 4, md: 4.5 }} {...props}>
      <Stack
        direction={{ base: 'column', lg: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', lg: 'center' }}
        spacing={4}
      >
        <HStack align="flex-start" spacing={4}>
          {icon ? (
            <Center
              w={12}
              h={12}
              borderRadius="2xl"
              bg="rgba(0,122,255,0.12)"
              border="1px solid"
              borderColor="rgba(0,122,255,0.20)"
              flexShrink={0}
            >
              <Icon as={icon as ElementType} boxSize={5} color="sos.blue.300" />
            </Center>
          ) : null}
          <VStack align="flex-start" spacing={1.5} flex="1">
            {eyebrow ? <ShellSectionEyebrow>{eyebrow}</ShellSectionEyebrow> : null}
            {typeof title === 'string' ? (
              <Heading size="lg" color="white" letterSpacing="tight">
                {title}
              </Heading>
            ) : (
              title
            )}
            {description ? (
              <Text color="text.secondary" fontSize="sm" maxW="4xl">
                {description}
              </Text>
            ) : null}
            {meta ? (
              <Flex wrap="wrap" gap={2} pt={1}>
                {meta}
              </Flex>
            ) : null}
          </VStack>
        </HStack>
        {actions ? (
          <Flex wrap="wrap" gap={3} align="center" justify={{ base: 'flex-start', lg: 'flex-end' }}>
            {actions}
          </Flex>
        ) : null}
      </Stack>
    </ShellSurface>
  );
}

export interface PagePanelProps extends BoxProps {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon | ElementType;
  actions?: ReactNode;
  footer?: ReactNode;
  tone?: Tone;
}

export function PagePanel({
  title,
  description,
  eyebrow,
  icon,
  actions,
  footer,
  tone = 'default',
  children,
  ...props
}: PagePanelProps) {
  const accentColor = toneColorMap[tone];

  return (
    <ShellSurface variant="panel" position="relative" overflow="hidden" p={{ base: 4, md: 5 }} {...props}>
      <Box position="absolute" insetX={0} top={0} h="1px" bg={accentColor} opacity={0.9} />
      {title || description || eyebrow || actions ? (
        <Stack
          direction={{ base: 'column', lg: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', lg: 'flex-start' }}
          spacing={4}
          mb={5}
        >
          <HStack align="flex-start" spacing={3}>
            {icon ? (
              <Center
                w={10}
                h={10}
                borderRadius="xl"
                bg={toneBackgroundMap[tone]}
                border="1px solid"
                borderColor="border.subtle"
                flexShrink={0}
              >
                <Icon as={icon as ElementType} boxSize={4} color={accentColor} />
              </Center>
            ) : null}
            <VStack align="flex-start" spacing={1}>
              {eyebrow ? <ShellSectionEyebrow>{eyebrow}</ShellSectionEyebrow> : null}
              {typeof title === 'string' ? (
                <Heading size="sm" color="white">
                  {title}
                </Heading>
              ) : (
                title
              )}
              {description ? (
                <Text color="text.secondary" fontSize="sm">
                  {description}
                </Text>
              ) : null}
            </VStack>
          </HStack>
          {actions ? (
            <Flex wrap="wrap" gap={2} align="center">
              {actions}
            </Flex>
          ) : null}
        </Stack>
      ) : null}
      <Box>{children}</Box>
      {footer ? <Box mt={5}>{footer}</Box> : null}
    </ShellSurface>
  );
}

export interface MetricCardProps extends BoxProps {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  trend?: ReactNode;
  icon?: ReactNode | LucideIcon | ElementType;
  tone?: Tone;
  accentColor?: string;
  isLive?: boolean;
  children?: ReactNode;
}

export function MetricCard({
  label,
  value,
  helper,
  trend,
  icon,
  tone = 'default',
  accentColor,
  isLive = false,
  children,
  ...props
}: MetricCardProps) {
  const resolvedAccent = accentColor ?? toneColorMap[tone];

  return (
    <PagePanel tone={tone} p={4} {...props}>
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <ShellSectionEyebrow>{label}</ShellSectionEyebrow>
          {trend ? (
            <ShellTelemetryBadge tone={tone}>{trend}</ShellTelemetryBadge>
          ) : isLive ? (
            <ShellLiveIndicator label="ao vivo" />
          ) : null}
        </Flex>
        <HStack justify="space-between" align="flex-end" spacing={4}>
          <VStack align="flex-start" spacing={1}>
            <Text
              fontFamily="mono"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="700"
              color="white"
              lineHeight={1}
            >
              {value}
            </Text>
            {helper ? (
              <Text fontSize="xs" color="text.secondary">
                {helper}
              </Text>
            ) : null}
          </VStack>
          {icon ? (
            <Center
              w={11}
              h={11}
              borderRadius="2xl"
              bg={toneBackgroundMap[tone]}
              border="1px solid"
              borderColor="border.subtle"
              color={resolvedAccent}
              flexShrink={0}
            >
              {renderIconNode(icon, resolvedAccent)}
            </Center>
          ) : null}
        </HStack>
        {children ? <Box>{children}</Box> : null}
      </VStack>
    </PagePanel>
  );
}

interface StateFrameProps extends CenterProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon | ElementType;
  tone?: Tone;
}

function StateFrame({
  title,
  description,
  action,
  icon,
  tone = 'default',
  minH = '280px',
  ...props
}: StateFrameProps) {
  const accentColor = toneColorMap[tone];

  return (
    <Center minH={minH} px={4} py={8} {...props}>
      <VStack spacing={4} maxW="lg" textAlign="center">
        <Center
          w={14}
          h={14}
          borderRadius="3xl"
          bg={toneBackgroundMap[tone]}
          border="1px solid"
          borderColor="border.subtle"
          color={accentColor}
        >
          <Icon as={(icon ?? Inbox) as ElementType} boxSize={6} />
        </Center>
        {typeof title === 'string' ? (
          <Heading size="sm" color="white">
            {title}
          </Heading>
        ) : (
          title
        )}
        {description ? (
          <Text fontSize="sm" color="text.secondary">
            {description}
          </Text>
        ) : null}
        {action ? <Box pt={1}>{action}</Box> : null}
      </VStack>
    </Center>
  );
}

export interface PageLoadingStateProps extends Omit<StateFrameProps, 'title' | 'icon' | 'action'> {
  label?: ReactNode;
}

export function PageLoadingState({
  label = 'Sincronizando dados',
  description = 'Aguarde enquanto o sistema recompõe o estado operacional.',
  tone = 'info',
  ...props
}: PageLoadingStateProps) {
  return (
    <Center minH={props.minH ?? '280px'} px={4} py={8} {...props}>
      <VStack spacing={4} maxW="lg" textAlign="center">
        <Spinner size="xl" color={toneColorMap[tone]} thickness="3px" speed="0.75s" />
        <VStack spacing={1}>
          <Heading size="sm" color="white">
            {label}
          </Heading>
          {description ? (
            <Text fontSize="sm" color="text.secondary">
              {description}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Center>
  );
}

export interface PageEmptyStateProps extends Omit<StateFrameProps, 'title'> {
  title?: ReactNode;
}

export function PageEmptyState({
  title = 'Nenhum dado disponível',
  description = 'Nenhum registro corresponde ao recorte operacional atual.',
  icon = Inbox,
  tone = 'default',
  ...props
}: PageEmptyStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      {...props}
    />
  );
}

export interface PageErrorStateProps extends Omit<StateFrameProps, 'title' | 'icon'> {
  title?: ReactNode;
}

export function PageErrorState({
  title = 'Falha ao carregar dados',
  description = 'O sistema não conseguiu compor esta visão com os dados atuais.',
  tone = 'critical',
  ...props
}: PageErrorStateProps) {
  return (
    <StateFrame
      title={title}
      description={description}
      icon={AlertTriangle}
      tone={tone}
      {...props}
    />
  );
}
