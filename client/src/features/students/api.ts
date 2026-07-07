import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import { downloadFile } from '@/lib/download';
import type { Paginated, Student } from '@/types/domain';
import type { StudentCreateInput } from '@/lib/schemas';

export interface StudentListParams {
  q?: string;
  class_id?: number;
  status?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
}

/** Normalise either a bare array or a paginated envelope into a list + total. */
function toList(data: unknown): { items: Student[]; total: number } {
  if (Array.isArray(data)) return { items: data as Student[], total: (data as Student[]).length };
  const p = data as Paginated<Student>;
  return { items: p.items ?? [], total: p.total ?? p.items?.length ?? 0 };
}

export function useStudents(params: StudentListParams = {}) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      const res = await api.get('/students', { params });
      return toList(unwrap(res.data));
    },
  });
}

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: ['student', id],
    enabled: id != null,
    queryFn: async () => unwrap<Student>((await api.get(`/students/${id}`)).data),
  });
}

export function useAdmitStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StudentCreateInput) =>
      unwrap<Student>((await api.post('/students', input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StudentCreateInput>) =>
      unwrap<Student>((await api.patch(`/students/${id}`, input)).data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
  });
}

/**
 * Upload a student's photograph (multipart, field "photo"; Admin-only endpoint).
 * The student must already exist, so callers pass the id at mutate time —
 * this lets the same hook serve edit mode and the post-admit chain in create mode.
 */
export function useUploadStudentPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append('photo', file);
      const res = await api.post(`/students/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap<Student>(res.data);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function downloadAdmissionLetter(student: Student) {
  return downloadFile(`/students/${student.id}/receipt`, `admission-${student.admissionNo}.pdf`);
}
