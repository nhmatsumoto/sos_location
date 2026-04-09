import { useEffect, useState } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  SimpleGrid, 
  Icon, 
  Badge,
  Text,
  Input,
  Textarea,
  Flex,
  Avatar,
  IconButton,
  Center,
  ScaleFade,
} from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Plus, 
  MapPin, 
  User, 
  Dog, 
  MessageSquare, 
  Clock, 
  MoreVertical,
  Navigation,
  Activity
} from 'lucide-react';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { TacticalButton } from '../../../components/atoms/TacticalButton';
import { reportsApi, type ReportItemApi } from '../../../services/reportsApi';
import { useNotifications } from '../../../context/useNotifications';
import { TacticalMap } from '../../../components/features/map/TacticalMap';

export function ReportsPage() {
  const [reports, setReports] = useState<ReportItemApi[]>([]);
  const [form, setForm] = useState({ 
    kind: 'person' as 'person' | 'animal', 
    name: '', 
    lastSeen: '', 
    details: '', 
    contact: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pushNotice } = useNotifications();

  const load = async () => {
    try {
      const data = await reportsApi.list();
      setReports(data.sort((a, b) => new Date(b.reportedAtUtc).getTime() - new Date(a.reportedAtUtc).getTime()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name || !form.lastSeen) {
      pushNotice({ type: 'warning', title: 'Atenção', message: 'Preencha o nome e a localização.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await reportsApi.create(form);
      setForm({ kind: 'person', name: '', lastSeen: '', details: '', contact: '' });
      pushNotice({ type: 'success', title: 'Relato Publicado', message: 'Sua informação foi enviada ao feed de operações.' });
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Erro de Publicação', message: 'Serviço de relatos indisponível no momento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box h="100%" w="100%" bg="sos.dark" p={6} overflow="hidden">
      <VStack spacing={6} align="stretch" h="full">
        {/* HEADER */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={0}>
             <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.2em">CENTRAL_DE_AVISTAMENTOS_E_RELATOS</TacticalText>
             <HStack>
               <Megaphone size={20} color="white" />
               <TacticalText variant="heading" fontSize="2xl">Relatos de Campo</TacticalText>
             </HStack>
          </VStack>
          
          <HStack spacing={4}>
             <TacticalButton variant="outline" leftIcon={<Activity size={14} />}>
                AO_VIVO: {reports.length} RELATOS
             </TacticalButton>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, xl: 5 }} spacing={6} flex={1} overflow="hidden">
           {/* LEFT: FORM (2 spans) */}
           <VStack spacing={6} align="stretch" gridColumn={{ xl: 'span 2' }}>
              <GlassPanel p={6} depth="raised" flexDirection="column">
                 <HStack mb={4}>
                    <Icon as={Plus} color="sos.blue.400" />
                    <TacticalText variant="subheading">NOVO_RELATO_DE_AVISTAMENTO</TacticalText>
                 </HStack>
                 
                 <VStack spacing={4} align="stretch">
                    <HStack spacing={3}>
                       <TacticalButton 
                          variant={form.kind === 'person' ? 'ghost' : 'outline'}
                          flex={1} leftIcon={<User size={16} />}
                          borderColor={form.kind === 'person' ? 'sos.blue.500' : 'whiteAlpha.200'}
                          bg={form.kind === 'person' ? 'rgba(0,122,255,0.1)' : 'transparent'}
                          onClick={() => setForm(p => ({...p, kind: 'person'}))}
                       >
                          PESSOA
                       </TacticalButton>
                       <TacticalButton 
                          variant={form.kind === 'animal' ? 'ghost' : 'outline'}
                          flex={1} leftIcon={<Dog size={16} />}
                          borderColor={form.kind === 'animal' ? 'sos.blue.500' : 'whiteAlpha.200'}
                          bg={form.kind === 'animal' ? 'rgba(0,122,255,0.1)' : 'transparent'}
                          onClick={() => setForm(p => ({...p, kind: 'animal'}))}
                       >
                          ANIMAL
                       </TacticalButton>
                    </HStack>

                    <Box>
                       <TacticalText variant="caption" mb={2}>NOME_OU_REFERÊNCIA</TacticalText>
                       <Input value={form.name} placeholder="Ex: Criança vestindo azul" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, name: e.target.value}))} />
                    </Box>

                    <Box>
                       <TacticalText variant="caption" mb={2}>ÚLTIMA_LOCALIZAÇÃO_DETECTADA</TacticalText>
                       <Input value={form.lastSeen} placeholder="Ex: Topo do morro logo após a ponte" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, lastSeen: e.target.value}))} />
                    </Box>

                    <Box>
                       <TacticalText variant="caption" mb={2}>DETALHES_DO_AVISTAMENTO</TacticalText>
                       <Textarea value={form.details} placeholder="Descreva o que viu..." 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100" rows={4}
                          onChange={(e) => setForm(p => ({...p, details: e.target.value}))} />
                    </Box>

                    <Box>
                       <TacticalText variant="caption" mb={2}>CONTATO_DO_RELATOR</TacticalText>
                       <Input value={form.contact} placeholder="Seu nome ou telefone" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, contact: e.target.value}))} />
                    </Box>

                    <TacticalButton mt={2} bg="sos.blue.500" h="56px" glow loading={isSubmitting} onClick={submit}>
                       PUBLICAR NO_FEED_OPERACIONAL
                    </TacticalButton>
                 </VStack>
              </GlassPanel>

              {/* MAP PREVIEW */}
              <GlassPanel p={0} flex={1} overflow="hidden" position="relative" minH="250px">
                 <TacticalMap 
                    center={[-20.91, -42.98]} 
                    zoom={14} 
                 />
              </GlassPanel>
           </VStack>

           {/* RIGHT: TIMELINE (3 spans) */}
           <VStack spacing={4} align="stretch" gridColumn={{ xl: 'span 3' }} overflowY="auto" className="custom-scrollbar" pr={2}>
              <AnimatePresence>
                 {reports.map((report, idx) => (
                    <ScaleFade key={report.id} in={true} initialScale={0.95}>
                       <GlassPanel p={5} depth="raised" transition="all 0.2s" _hover={{ bg: 'whiteAlpha.100' }}>
                          <Flex justify="space-between" align="start">
                             <HStack spacing={4} align="start">
                                <Avatar 
                                   icon={report.kind === 'person' ? <User size={20} /> : <Dog size={20} />}
                                   bg={report.kind === 'person' ? 'sos.blue.500' : 'sos.amber.500'}
                                   size="sm"
                                />
                                <VStack align="start" spacing={1}>
                                   <HStack>
                                      <Text fontWeight="bold" color="white" fontSize="md">{report.name}</Text>
                                      <Badge colorScheme={report.kind === 'person' ? 'blue' : 'orange'} variant="subtle" fontSize="9px">
                                         {report.kind.toUpperCase()}
                                      </Badge>
                                      {idx === 0 && (
                                         <Badge colorScheme="green" variant="solid" fontSize="9px">RECENTE</Badge>
                                      )}
                                   </HStack>
                                   <HStack spacing={3} color="whiteAlpha.600">
                                      <HStack spacing={1}>
                                         <Icon as={MapPin} size={12} color="sos.blue.400" />
                                         <Text fontSize="xs">{report.lastSeen}</Text>
                                      </HStack>
                                      <HStack spacing={1}>
                                         <Icon as={Clock} size={12} />
                                         <Text fontSize="xs">{new Date(report.reportedAtUtc).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                                      </HStack>
                                   </HStack>
                                   
                                   <Text color="whiteAlpha.800" mt={2} fontSize="sm" lineHeight="tall">
                                      {report.details}
                                   </Text>

                                   <HStack mt={3} spacing={4}>
                                      <HStack spacing={1} cursor="pointer" _hover={{ color: 'sos.blue.400' }}>
                                         <Icon as={MessageSquare} size={14} />
                                         <TacticalText variant="mono" fontSize="10px">RESPONDER</TacticalText>
                                      </HStack>
                                      <HStack spacing={1} cursor="pointer" _hover={{ color: 'sos.blue.400' }}>
                                         <Icon as={Navigation} size={14} />
                                         <TacticalText variant="mono" fontSize="10px">NAVEGAR_AO_PONTO</TacticalText>
                                      </HStack>
                                   </HStack>
                                </VStack>
                             </HStack>
                             
                             <IconButton 
                                aria-label="More" icon={<MoreVertical size={16} />} 
                                size="sm" variant="ghost" color="whiteAlpha.400"
                             />
                          </Flex>
                       </GlassPanel>
                    </ScaleFade>
                 ))}
              </AnimatePresence>

              {reports.length === 0 && (
                 <Center flex={1} flexDirection="column" p={20}>
                    <Icon as={MessageSquare} size={48} color="whiteAlpha.100" mb={4} />
                    <TacticalText variant="heading" fontSize="xl" opacity={0.3}>SILÊNCIO_NO_CANAL</TacticalText>
                    <TacticalText variant="caption" mt={2} opacity={0.3}>Nenhum relato de campo detectado nas últimas 24h.</TacticalText>
                 </Center>
              )}
           </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
