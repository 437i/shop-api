package client

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"be2/internal/address"

	"github.com/google/uuid"
)

func mustParseDate(t *testing.T, value string) time.Time {
	t.Helper()

	parsed, err := time.Parse(time.DateOnly, value)
	if err != nil {
		t.Fatalf("parse %q: %v", value, err)
	}
	return parsed
}

func TestValidateBirthday(t *testing.T) {
	now := time.Date(2026, time.October, 16, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		birthday string
		wantErr  error
	}{
		{name: "future date", birthday: "2026-10-17", wantErr: ErrTimeTravel},
		{name: "today is not future", birthday: "2026-10-16", wantErr: ErrTooYoung},
		{name: "day before 16th birthday", birthday: "2010-10-17", wantErr: ErrTooYoung},
		{name: "exactly 16", birthday: "2010-10-16", wantErr: nil},
		{name: "day after 16th birthday", birthday: "2010-10-15", wantErr: nil},
		{name: "17 years old", birthday: "2009-10-16", wantErr: nil},
		{name: "exactly 100", birthday: "1926-10-16", wantErr: nil},
		{name: "100 with birthday yesterday", birthday: "1926-10-15", wantErr: nil},
		{name: "100 with 101st birthday tomorrow", birthday: "1925-10-17", wantErr: nil},
		{name: "101st birthday today", birthday: "1925-10-16", wantErr: ErrTooOld},
		{name: "day after 101st birthday", birthday: "1925-10-15", wantErr: ErrTooOld},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateBirthday(mustParseDate(t, tt.birthday), now)

			switch {
			case tt.wantErr == nil && err != nil:
				t.Fatalf("birthday %s: unexpected error %v", tt.birthday, err)
			case tt.wantErr != nil && !errors.Is(err, tt.wantErr):
				t.Fatalf("birthday %s: got %v, want %v", tt.birthday, err, tt.wantErr)
			}
		})
	}
}

func TestValidateBirthdayTimeOfDay(t *testing.T) {
	birthdays := []string{
		"2026-10-17",
		"2026-10-16",
		"2010-10-17",
		"2010-10-16",
		"1925-10-17",
		"1925-10-16",
	}

	startOfDay := time.Date(2026, time.October, 16, 0, 0, 1, 0, time.UTC)
	endOfDay := time.Date(2026, time.October, 16, 23, 59, 59, 0, time.UTC)

	for _, birthday := range birthdays {
		t.Run(birthday, func(t *testing.T) {
			bday := mustParseDate(t, birthday)

			startErr := validateBirthday(bday, startOfDay)
			endErr := validateBirthday(bday, endOfDay)

			if startErr != endErr {
				t.Fatalf("verdict depends on time of day: start %v, end %v", startErr, endErr)
			}
		})
	}
}

func TestValidateBirthdayTimezone(t *testing.T) {
	instant := time.Date(2026, time.October, 16, 23, 30, 0, 0, time.UTC)
	birthdays := []string{
		"2026-10-17",
		"2026-10-16",
		"2010-10-16",
		"1925-10-16",
	}

	zones := []*time.Location{
		time.UTC,
		time.FixedZone("UTC+14", 14*60*60),
		time.FixedZone("UTC-12", -12*60*60),
	}

	for _, birthday := range birthdays {
		t.Run(birthday, func(t *testing.T) {
			bday := mustParseDate(t, birthday)

			want := validateBirthday(bday, instant.In(time.UTC))
			for _, zone := range zones[1:] {
				got := validateBirthday(bday, instant.In(zone))
				if got != want {
					t.Fatalf("verdict depends on zone %s: got %v, want %v", zone, got, want)
				}
			}
		})
	}
}

func TestValidateBirthdayFeb29(t *testing.T) {
	tests := []struct {
		name     string
		birthday string
		today    string
		wantErr  error
	}{
		{name: "16th birthday on Feb 28 of non-leap year not reached", birthday: "2000-02-29", today: "2016-02-28", wantErr: ErrTooYoung},
		{name: "16th birthday on Feb 29 of leap year reached", birthday: "2000-02-29", today: "2016-02-29", wantErr: nil},
		{name: "16th birthday on Mar 1 of leap year reached", birthday: "2000-02-29", today: "2016-03-01", wantErr: nil},
		{name: "100 on Feb 28 of non-leap year", birthday: "1924-02-29", today: "2025-02-28", wantErr: nil},
		{name: "101st birthday on Mar 1 of non-leap year", birthday: "1924-02-29", today: "2025-03-01", wantErr: ErrTooOld},
		{name: "age 100 on leap day", birthday: "1915-03-01", today: "2016-02-29", wantErr: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			now := mustParseDate(t, tt.today).Add(12 * time.Hour)
			err := validateBirthday(mustParseDate(t, tt.birthday), now)

			switch {
			case tt.wantErr == nil && err != nil:
				t.Fatalf("birthday %s today %s: unexpected error %v", tt.birthday, tt.today, err)
			case tt.wantErr != nil && !errors.Is(err, tt.wantErr):
				t.Fatalf("birthday %s today %s: got %v, want %v", tt.birthday, tt.today, err, tt.wantErr)
			}
		})
	}
}

type fakeRepository struct {
	createCalls []Client
	createID    uuid.UUID
	createErr   error
}

func (f *fakeRepository) Create(ctx context.Context, client Client) (Client, error) {
	f.createCalls = append(f.createCalls, client)
	if f.createErr != nil {
		return Client{}, f.createErr
	}
	client.ID = f.createID
	return client, nil
}

func (f *fakeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (f *fakeRepository) GetList(ctx context.Context, params ListFilter) ([]ClientWithAddress, error) {
	return nil, nil
}

func (f *fakeRepository) UpdateAddress(ctx context.Context, id uuid.UUID, addressID uuid.UUID) error {
	return nil
}

type fakeAddressRepository struct {
	getOrCreateCalls []address.Address
	getOrCreateID    uuid.UUID
	getOrCreateErr   error
}

func (f *fakeAddressRepository) GetOrCreate(ctx context.Context, addr address.Address) (uuid.UUID, error) {
	f.getOrCreateCalls = append(f.getOrCreateCalls, addr)
	return f.getOrCreateID, f.getOrCreateErr
}

type fakeTransactor struct {
	doCalls int
	doErr   error
}

func (f *fakeTransactor) Do(ctx context.Context, fn func(ctx context.Context) error) error {
	f.doCalls++
	if f.doErr != nil {
		return f.doErr
	}
	return fn(ctx)
}

func TestCreate(t *testing.T) {
	clientID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	addressID := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	validClient := Client{
		Name:     "Иван",
		Surname:  "Иванов",
		Birthday: time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		Gender:   Male,
	}
	validAddress := address.Address{
		Country: "Россия",
		City:    "Москва",
		Street:  "Ленина, 10",
	}

	t.Run("valid birthday reaches repositories", func(t *testing.T) {
		repo := &fakeRepository{createID: clientID}
		addressRepo := &fakeAddressRepository{getOrCreateID: addressID}
		tx := &fakeTransactor{}

		svc := NewService(repo, addressRepo, tx)
		created, addr, err := svc.Create(context.Background(), validClient, validAddress)
		if err != nil {
			t.Fatalf("Create: %v", err)
		}

		if tx.doCalls != 1 {
			t.Fatalf("transactor calls = %d, want 1", tx.doCalls)
		}
		if len(addressRepo.getOrCreateCalls) != 1 {
			t.Fatalf("address GetOrCreate calls = %d, want 1", len(addressRepo.getOrCreateCalls))
		}
		if got := addressRepo.getOrCreateCalls[0]; got != validAddress {
			t.Errorf("GetOrCreate address = %+v, want %+v", got, validAddress)
		}
		if len(repo.createCalls) != 1 {
			t.Fatalf("repository Create calls = %d, want 1", len(repo.createCalls))
		}
		if got := repo.createCalls[0]; got.AddressID != addressID {
			t.Errorf("saved AddressID = %v, want %v", got.AddressID, addressID)
		}
		if created.ID != clientID {
			t.Errorf("created.ID = %v, want %v", created.ID, clientID)
		}
		if created.AddressID != addressID {
			t.Errorf("created.AddressID = %v, want %v", created.AddressID, addressID)
		}
		if addr.ID != addressID {
			t.Errorf("addr.ID = %v, want %v", addr.ID, addressID)
		}
	})

	t.Run("invalid age stops before transaction", func(t *testing.T) {
		tests := []struct {
			name     string
			birthday time.Time
			wantErr  error
		}{
			{name: "too young", birthday: time.Now().UTC().AddDate(-10, 0, 0), wantErr: ErrTooYoung},
			{name: "future", birthday: time.Now().UTC().AddDate(0, 0, 2), wantErr: ErrTimeTravel},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				repo := &fakeRepository{}
				addressRepo := &fakeAddressRepository{}
				tx := &fakeTransactor{}

				svc := NewService(repo, addressRepo, tx)
				input := validClient
				input.Birthday = tt.birthday

				_, _, err := svc.Create(context.Background(), input, validAddress)
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Create err = %v, want %v", err, tt.wantErr)
				}
				if !strings.Contains(err.Error(), "validate bday: ") {
					t.Fatalf("error %q does not preserve wrapper prefix", err)
				}
				if tx.doCalls != 0 {
					t.Fatalf("transactor calls = %d, want 0", tx.doCalls)
				}
				if len(addressRepo.getOrCreateCalls) != 0 {
					t.Fatalf("address GetOrCreate calls = %d, want 0", len(addressRepo.getOrCreateCalls))
				}
				if len(repo.createCalls) != 0 {
					t.Fatalf("repository Create calls = %d, want 0", len(repo.createCalls))
				}
			})
		}
	})
}
