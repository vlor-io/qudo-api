import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@/users/users.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, displayName } = dto;

    // 1. 중복 이메일 체크
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 2. 비밀번호 해싱
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. 유저 생성
    const user = await this.usersService.createEmailUser(email, passwordHash, displayName);

    // 4. 토큰 발급
    return this.generateTokens(user, true);
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    // 1. 유저 찾기 (비밀번호 포함)
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 3. 토큰 발급
    return this.generateTokens(user, false);
  }

  async socialLogin(dto: SocialLoginDto) {
    const { provider, token } = dto;

    // TODO: 원래는 provider 서버(카카오/구글 등)에 token을 들고 가서 검증해야 하지만,
    // [현재는 쾌속 개발을 위해 임의의 Mocking 로직으로 무조건 통과시킨다고 가정]
    const mockProviderId = `${provider}_${token.slice(0, 10)}`; 
    const mockName = `${provider}유저_${token.slice(0, 4)}`;
    const mockEmail = `test_${token.slice(0, 6)}@${provider}.com`;

    let user = await this.usersService.findByProviderId(mockProviderId);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.createUser(mockProviderId, mockName, mockEmail);
      isNewUser = true;
    }

    return this.generateTokens(user, isNewUser);
  }

  private async generateTokens(user: any, isNewUser: boolean) {
    const payload = { sub: user.id, role: user.role };
    
    const accessTokenTtl = this.configService.get<number>('JWT_ACCESS_TTL') || 3600;
    const refreshTokenTtl = this.configService.get<number>('JWT_REFRESH_TTL') || 2592000;

    const accessToken = this.jwtService.sign(payload, { expiresIn: `${accessTokenTtl}s` });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: `${refreshTokenTtl}s` }); 

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenTtl,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUri: user.avatarUri,
        plan: user.plan,
        role: user.role,
      },
      isNewUser,
    };
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const decoded = this.jwtService.verify(oldRefreshToken);
      const payload = { sub: decoded.sub, role: decoded.role };
      
      const accessTokenTtl = this.configService.get<number>('JWT_ACCESS_TTL') || 3600;
      const accessToken = this.jwtService.sign(payload, { expiresIn: `${accessTokenTtl}s` });
      
      return {
        accessToken,
        expiresIn: accessTokenTtl,
      };
    } catch (error) {
      throw new UnauthorizedException('만료되거나 유효하지 않은 Refresh Token입니다.');
    }
  }
}
