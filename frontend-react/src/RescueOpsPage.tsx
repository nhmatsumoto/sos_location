import { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Link,
  Stack,
  Table,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { Siren, MapPinned, Users, ClipboardCheck, Plus, Trash2, Pencil } from 'lucide-react';

type TaskStatus = 'aberto' | 'em_acao' | 'concluido';

type RescueTask = {
  id: string;
  title: string;
  team: string;
  priority: 'alta' | 'media' | 'baixa';
  location: string;
  description: string;
  status: TaskStatus;
};

const initialTask: Omit<RescueTask, 'id'> = {
  title: '',
  team: '',
  priority: 'alta',
  location: '',
  description: '',
  status: 'aberto',
};

const statusColor = (status: TaskStatus) => {
  if (status === 'concluido') return 'green';
  if (status === 'em_acao') return 'orange';
  return 'red';
};

export default function RescueOpsPage() {
  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [form, setForm] = useState(initialTask);
  const [editingId, setEditingId] = useState<string | null>(null);

  const summary = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status === 'aberto').length,
    active: tasks.filter((task) => task.status === 'em_acao').length,
    done: tasks.filter((task) => task.status === 'concluido').length,
  }), [tasks]);

  const resetForm = () => {
    setForm(initialTask);
    setEditingId(null);
  };

  const submitTask = () => {
    if (!form.title.trim() || !form.team.trim() || !form.location.trim()) return;

    if (editingId) {
      setTasks((prev) => prev.map((task) => (task.id === editingId ? { ...task, ...form } : task)));
      resetForm();
      return;
    }

    setTasks((prev) => [{ id: `${Date.now()}`, ...form }, ...prev]);
    resetForm();
  };

  const startEdit = (task: RescueTask) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      team: task.team,
      priority: task.priority,
      location: task.location,
      description: task.description,
      status: task.status,
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    if (editingId === id) resetForm();
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg="linear-gradient(180deg, #0b1220 0%, #101827 40%, #0f172a 100%)" minH="100vh" color="gray.100">
      <Stack gap={6} maxW="7xl" mx="auto">
        <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
          <Box>
            <Heading size="lg">Central de Resgate e Voluntários</Heading>
            <Text color="gray.400">Operação imediata: priorização de ocorrências, coordenação de equipes e execução rápida.</Text>
          </Box>
          <HStack>
            <Link href="/hotspots"><Button colorPalette="blue" variant="solid"><MapPinned size={16} />Mapa Tático</Button></Link>
            <Link href="/news"><Button colorPalette="gray" variant="outline">Boletins</Button></Link>
          </HStack>
        </Flex>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
          <Card.Root bg="#111b2e" border="1px solid" borderColor="#23314a"><Card.Body><HStack justify="space-between"><Text color="gray.300">Total</Text><ClipboardCheck size={18} /></HStack><Heading size="md">{summary.total}</Heading></Card.Body></Card.Root>
          <Card.Root bg="#1f1515" border="1px solid" borderColor="#5b1f1f"><Card.Body><HStack justify="space-between"><Text color="red.200">Abertos</Text><Siren size={18} color="#f87171" /></HStack><Heading size="md" color="red.300">{summary.open}</Heading></Card.Body></Card.Root>
          <Card.Root bg="#221a11" border="1px solid" borderColor="#6a3f18"><Card.Body><HStack justify="space-between"><Text color="orange.200">Em ação</Text><Users size={18} color="#fb923c" /></HStack><Heading size="md" color="orange.300">{summary.active}</Heading></Card.Body></Card.Root>
          <Card.Root bg="#112117" border="1px solid" borderColor="#1f5f3a"><Card.Body><HStack justify="space-between"><Text color="green.200">Concluídos</Text><ClipboardCheck size={18} color="#4ade80" /></HStack><Heading size="md" color="green.300">{summary.done}</Heading></Card.Body></Card.Root>
        </Grid>

        <Grid templateColumns={{ base: '1fr', lg: '1.1fr 1.9fr' }} gap={4}>
          <Card.Root bg="#111827" border="1px solid" borderColor="#243244">
            <Card.Header>
              <Heading size="sm">{editingId ? 'Editar ocorrência' : 'Nova ocorrência de resgate'}</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap={3}>
                <Input placeholder="Título da ocorrência" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Equipe responsável" value={form.team} onChange={(e) => setForm((p) => ({ ...p, team: e.target.value }))} />
                <Input placeholder="Local da ocorrência" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as RescueTask['priority'] }))} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                  <option value="alta">Prioridade alta</option>
                  <option value="media">Prioridade média</option>
                  <option value="baixa">Prioridade baixa</option>
                </select>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                  <option value="aberto">Aberto</option>
                  <option value="em_acao">Em ação</option>
                  <option value="concluido">Concluído</option>
                </select>
                <Textarea placeholder="Descrição operacional" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                <HStack>
                  <Button colorPalette="green" onClick={submitTask}><Plus size={16} />{editingId ? 'Salvar' : 'Criar'}</Button>
                  {editingId && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
                </HStack>
              </Stack>
            </Card.Body>
          </Card.Root>

          <Card.Root bg="#111827" border="1px solid" borderColor="#243244">
            <Card.Header>
              <Heading size="sm">Fila operacional (CRUD)</Heading>
            </Card.Header>
            <Card.Body>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Ocorrência</Table.ColumnHeader>
                    <Table.ColumnHeader>Equipe</Table.ColumnHeader>
                    <Table.ColumnHeader>Local</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tasks.length === 0 ? (
                    <Table.Row><Table.Cell colSpan={5}><Text color="gray.400">Sem ocorrências registradas.</Text></Table.Cell></Table.Row>
                  ) : tasks.map((task) => (
                    <Table.Row key={task.id}>
                      <Table.Cell>
                        <Stack gap={0}>
                          <Text fontWeight="semibold">{task.title}</Text>
                          <Text fontSize="xs" color="gray.400">{task.description || 'Sem descrição'}</Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>{task.team}</Table.Cell>
                      <Table.Cell>{task.location}</Table.Cell>
                      <Table.Cell><Badge colorPalette={statusColor(task.status)}>{task.status.replace('_', ' ')}</Badge></Table.Cell>
                      <Table.Cell>
                        <HStack>
                          <Button size="xs" variant="outline" onClick={() => updateStatus(task.id, 'em_acao')}>Acionar</Button>
                          <Button size="xs" variant="outline" onClick={() => updateStatus(task.id, 'concluido')}>Concluir</Button>
                          <Button size="xs" variant="outline" onClick={() => startEdit(task)}><Pencil size={12} /></Button>
                          <Button size="xs" colorPalette="red" variant="subtle" onClick={() => deleteTask(task.id)}><Trash2 size={12} /></Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>
        </Grid>
      </Stack>
    </Box>
  );
}
