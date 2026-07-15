import bcrypt from "bcryptjs";
import { AppError } from "@/lib/errors";
import { userRepository } from "./repository";
import type { CreateUserDTO, UpdateUserDTO, ListUsersDTO } from "./dto";

export const userService = {
  list(organizationId: string, params: ListUsersDTO) {
    return userRepository.list(organizationId, params);
  },

  async findById(id: string, organizationId: string) {
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
    return user;
  },

  async create(organizationId: string, dto: CreateUserDTO) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return userRepository.create({ ...dto, organizationId, passwordHash });
  },

  async update(id: string, organizationId: string, dto: UpdateUserDTO) {
    await this.findById(id, organizationId);
    return userRepository.update(id, organizationId, dto);
  },

  async remove(id: string, organizationId: string, requestUserId: string) {
    if (id === requestUserId) throw new AppError("Não é possível remover a si mesmo", 400, "BAD_REQUEST");
    await this.findById(id, organizationId);
    return userRepository.softDelete(id);
  },
};
